import { gql, useQuery } from "@apollo/client";
import { GetProblemBySlugQuery, GetProblemBySlugQueryVariables, ProblemEntity } from "../__generated__/graphql";
import { ProblemSchema } from "./schema";
import { flattenObj } from "../utils/flatten-obj";

const GET_PROBLEM_BY_SLUG = gql`
query GetProblemBySlug($slug: String) {
  problems(filters: {slug: { eq: $slug }}) {
    data {
      id
      attributes {
        title
      	description
        testCases {
          data {
            id
            attributes {
              input
              output
              locked
              hidden
              explanation
            }
          }
        }
      }
    }
  }
}
`;

const mapFromQuery = (problem: ProblemEntity | undefined) => {
  if(!problem) return undefined;

  return ProblemSchema.parse(flattenObj(problem));
}

export const useGetProblemBySlug = () => {
  const { loading, data } = useQuery<GetProblemBySlugQuery, GetProblemBySlugQueryVariables>(
    GET_PROBLEM_BY_SLUG,
    {
      variables: {
        slug: "project-euler-1-multiples-of-3-and-5"
      }
    }
  );

  const problemsRaw = data?.problems?.data.map(mapFromQuery);

  if (!problemsRaw?.length) {
    return {
      problem: null,
      loading: false,
    }
  }

  const [ problemRaw ] = problemsRaw;

  const problem = ProblemSchema.parse(problemRaw);

  return {
    problem,
    loading
  }
}