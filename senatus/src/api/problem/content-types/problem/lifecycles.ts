async function getNextPosition(eventId: string){
  const problems = await strapi.documents('api::problem.problem').findMany({
    filters: {
      event: {
        documentId: eventId,
      }
    },
  });
  console.log("problems: ", problems?.length);
  let maxPosition = 0;
  problems?.forEach((problem) => {
    maxPosition = Math.max(maxPosition, problem.position || 0);
    console.log("problem: ", problem.title, problem.position);
  });

  return maxPosition + 1;
}

export default {
  async beforeCreate(lifecycle) {
    console.log("BEFORE CREATE LIFECYCLE");
    const { data } = lifecycle.params;

    const eventId = typeof data.event === 'string' ? data.event : data.event?.documentId;

    console.log("eventId: ", eventId);

    if (eventId) {
      data.position = await getNextPosition(eventId);
    }
    else{
      data.position = 1;
    }
  },

  async afterCreate(lifecycle) {
    console.log("AFTER CREATE LIFECYCLE");
    const { result } = lifecycle;
    
    const problem = await strapi.documents('api::problem.problem').findOne({
      documentId: result.documentId,
      populate: ['event'],
    });

    const event = problem.event;
    if (!event  || !event.documentId) return;

    await strapi.documents('api::problem.problem').update({
      documentId: problem.documentId,
      data: {
        position: await getNextPosition(event.documentId),
      },
    })
  },
}