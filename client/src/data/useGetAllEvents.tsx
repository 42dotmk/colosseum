import { gql, useQuery } from "@apollo/client";
import { EventEntity, GetEventsQuery, GetEventsQueryVariables } from "../__generated__/graphql";
import { EventSchema } from "./schema";

const GET_ALL_EVENTS = gql`
query GetEvents {
  events {
    data {
      id
      attributes {
        start
        title
        description
        end
        supportedLanguages {
          data {
            id
            attributes {
              name
            }
          }
        }
      }
    }
    meta {
      pagination {
        total
        page
        pageSize
        pageCount
      }
    }
    __typename
  }
}`

const mapFromQuery = (event: EventEntity | undefined) => {
  if(!event) return undefined;

  return {
    description: event.attributes?.description,
    startDate: event.attributes?.start,
    endDate: event.attributes?.end,
    title: event.attributes?.title,
    supportedLanguages: event.attributes?.supportedLanguages?.data.map((lang) => lang.attributes?.name),
    id: event.id
  }
}



export const useGetAllEvents = () => {
  const { loading, data } = useQuery<GetEventsQuery, GetEventsQueryVariables>(GET_ALL_EVENTS);
  const eventsRaw = data?.events?.data.map(mapFromQuery);

  return {
    events: eventsRaw ? EventSchema.array().parse(eventsRaw) : undefined, 
    loading
  }
}