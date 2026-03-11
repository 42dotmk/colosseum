/**
 * execution controller
 */

import { factories } from '@strapi/strapi'
import { getCurrentUser } from '../../../utils/current-user';

const isOwnedByUser = (owner: any, user: any) => {
	if (!owner || !user) {
		return false;
	}

	if (owner.documentId && user.documentId) {
		return owner.documentId === user.documentId;
	}

	if (typeof owner.id === 'number' && typeof user.id === 'number') {
		return owner.id === user.id;
	}

	return false;
};

const getCurrentUserFilter = (user: any) => {
	if (user?.documentId) {
		return { documentId: user.documentId };
	}

	if (typeof user?.id === 'number') {
		return { id: user.id };
	}

	return null;
};

const extractSubmissionDocumentIdFromFilters = (filters: any): string | null => {
	if (!filters || typeof filters !== 'object') {
		return null;
	}

	const submission = filters.submission;
	if (!submission || typeof submission !== 'object') {
		return null;
	}

	const documentId = submission.documentId;
	if (typeof documentId === 'string') {
		return documentId;
	}

	if (documentId && typeof documentId === 'object') {
		if (typeof documentId.$eq === 'string') {
			return documentId.$eq;
		}
		if (typeof documentId.$in?.[0] === 'string') {
			return documentId.$in[0];
		}
	}

	return null;
};

const sanitizeExecutionForParticipant = (execution: any) => {
	if (!execution) {
		return null;
	}

	const testCase = execution.testCase;
	const isLocked = !!testCase?.locked;
	const isHidden = !!testCase?.hidden;

	if (isLocked) {
		return null;
	}

	const nextExecution = {
		...execution,
	};

	if (isHidden) {
		nextExecution.stdout = '';
		nextExecution.stderr = '';
	}

	if (testCase) {
		nextExecution.testCase = {
			...testCase,
			input: isHidden ? undefined : testCase.input,
			output: isHidden ? undefined : testCase.output,
			explanation: isHidden ? undefined : testCase.explanation,
		};
	}

	return nextExecution;
};

const sanitizeExecutionResponse = (response: any) => {
	if (Array.isArray(response?.data)) {
		response.data = response.data
			.map((entry: any) => sanitizeExecutionForParticipant(entry))
			.filter((entry: any) => !!entry);
		return response;
	}

	if (response?.data) {
		const sanitized = sanitizeExecutionForParticipant(response.data);
		if (!sanitized) {
			response.data = null;
		}
		else {
			response.data = sanitized;
		}
		return response;
	}

	if (Array.isArray(response)) {
		return response
			.map((entry: any) => sanitizeExecutionForParticipant(entry))
			.filter((entry: any) => !!entry);
	}

	return sanitizeExecutionForParticipant(response);
};

export default factories.createCoreController('api::execution.execution', ({ strapi }) => ({
	async find(ctx) {
		const user = await getCurrentUser(strapi, ctx);
		if (!user) {
			return ctx.unauthorized('Authentication required');
		}

		if (!getCurrentUserFilter(user)) {
			return ctx.unauthorized('Authentication required');
		}

		const submissionDocumentId = extractSubmissionDocumentIdFromFilters(ctx.query?.filters);
		if (!submissionDocumentId) {
			return ctx.forbidden('Submission filter is required');
		}

		const submission = await strapi.documents('api::submission.submission').findOne({
			documentId: submissionDocumentId,
			populate: ['user'],
		});

		if (!submission || !isOwnedByUser(submission.user, user)) {
			return ctx.notFound('Submission not found');
		}

		const response = await super.find(ctx);
		return sanitizeExecutionResponse(response);
	},

	async findOne(ctx) {
		const user = await getCurrentUser(strapi, ctx);
		if (!user) {
			return ctx.unauthorized('Authentication required');
		}

		const execution = await strapi.documents('api::execution.execution').findOne({
			documentId: ctx.params.id,
			populate: ['submission', 'submission.user'],
		});

		const owner = execution?.submission?.user;
		if (!execution || !isOwnedByUser(owner, user)) {
			return ctx.notFound('Execution not found');
		}

		const response = await super.findOne(ctx);
		const sanitized = sanitizeExecutionResponse(response);
		if ((sanitized as any)?.data === null) {
			return ctx.notFound('Execution not found');
		}
		return sanitized;
	},
}));
