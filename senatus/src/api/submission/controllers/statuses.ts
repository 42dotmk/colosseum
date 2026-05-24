import { getCurrentUser } from '../../../utils/current-user';

export default {
  async getProblemStatuses(ctx) {
    const user = await getCurrentUser(strapi, ctx);
    if (!user) {
      return ctx.unauthorized('Authentication required');
    }

    const { eventId, mode } = ctx.query;
    const isTraining = mode === 'training';
    const now = Date.now();
    
    try {
      let targetProblems: any[] = [];
      let eventMap: Record<string, any> = {};

      if (isTraining) {
        const endedEvents = await strapi.documents('api::event.event').findMany({
          filters: { end: { $lt: new Date(now).toISOString() } },
          populate: ['problems', 'problems.testCases'],
        });

        for (const event of (endedEvents || [])) {
          if (event.problems) {
            for (const prob of event.problems) {
              targetProblems.push(prob);
              eventMap[prob.documentId] = event; 
            }
          }
        }
      } else {
        if (!eventId) {
          return ctx.badRequest('An eventId parameter is required outside of training mode.');
        }

        const currentEvent = await strapi.documents('api::event.event').findOne({
          documentId: eventId as string,
          populate: ['problems', 'problems.testCases'],
        });

        if (currentEvent && currentEvent.problems) {
          targetProblems = currentEvent.problems;
          for (const prob of targetProblems) {
            eventMap[prob.documentId] = currentEvent;
          }
        }
      }

      const problemIds = targetProblems.map((p) => p.documentId).filter(Boolean);
      const statusMap: Record<string, string> = {};

      for (const prob of targetProblems) {
        statusMap[prob.documentId] = 'not_tried';
      }

      if (problemIds.length === 0) {
        return ctx.body = { statuses: statusMap };
      }

      const submissionFilters: any = {
        user: { documentId: user.documentId },
        problem: { documentId: { $in: problemIds } },
      };

      if (isTraining) {
        submissionFilters.event = { $null: true };
      } else {
        submissionFilters.event = { documentId: eventId };
      }
      
      const submissions = await strapi.documents('api::submission.submission').findMany({
        filters: submissionFilters,
        populate: ['executions', 'executions.testCase', 'problem'],
        sort: 'createdAt:desc',
      });
      
      const submissionsByProblem = new Map<string, any[]>();
      for (const sub of (submissions || [])) {
        const probId = sub.problem?.documentId;
        if (probId) {
          if (!submissionsByProblem.has(probId)) {
            submissionsByProblem.set(probId, []);
          }
          submissionsByProblem.get(probId)!.push(sub);
        }
      }

      for (const problem of targetProblems) {
        const problemSubmissions = submissionsByProblem.get(problem.documentId) || [];
        
        if (problemSubmissions.length === 0) {
          continue;
        }

        const parentEvent = eventMap[problem.documentId];
        const eventEnded = parentEvent?.end ? new Date(parentEvent.end).getTime() <= now : false;

        const isTestcaseCounted = (tc?: { hidden?: boolean; locked?: boolean }) => {
          if (!tc) return true;
          if (isTraining || eventEnded) return true; 
          return !tc.locked; 
        };

        const totalCountedTCs = (problem.testCases || []).filter((tc: any) => isTestcaseCounted(tc)).length;

        const calculatePassedCount = (sub: any) => {
          const relevantExecutions = (sub.executions || []).filter((exec: any) => 
            isTestcaseCounted(exec.testCase)
          );
          return relevantExecutions.filter((exec: any) => exec.processed && exec.passed).length;
        };

        let finalPassedCount = 0;
        let finalExpectedCount = totalCountedTCs;
        let hasEvaluatedSubmission = false;

        if (isTraining) {
          let maxPassed = -1;
          
          for (const sub of problemSubmissions) {
            const passed = calculatePassedCount(sub);
            if (passed > maxPassed) {
              maxPassed = passed;
              hasEvaluatedSubmission = true;
              
              const relevantExecutionsCount = (sub.executions || []).filter((exec: any) => 
                isTestcaseCounted(exec.testCase)
              ).length;
              finalExpectedCount = totalCountedTCs || relevantExecutionsCount;
            }
          }
          finalPassedCount = maxPassed;
        } else {
          const latestSubmission = problemSubmissions[0];
          if (latestSubmission) {
            finalPassedCount = calculatePassedCount(latestSubmission);
            hasEvaluatedSubmission = true;

            const relevantExecutionsCount = (latestSubmission.executions || []).filter((exec: any) => 
              isTestcaseCounted(exec.testCase)
            ).length;
            finalExpectedCount = totalCountedTCs || relevantExecutionsCount;
          }
        }

        if (!hasEvaluatedSubmission) {
          continue;
        }

        if (finalExpectedCount <= 0 || finalPassedCount <= 0) {
          statusMap[problem.documentId] = 'zero';
        } else if (finalPassedCount >= finalExpectedCount) {
          statusMap[problem.documentId] = 'full';
        } else {
          statusMap[problem.documentId] = 'partial';
        }
      }

      ctx.body = { statuses: statusMap };
    } catch (err) {
      console.error(err);
      ctx.body = { error: 'Failed to fetch problem statuses' };
    }
  }
}