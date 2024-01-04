import type { Schema, Attribute } from '@strapi/strapi';

export interface ProblemStarterCode extends Schema.Component {
  collectionName: 'components_problem_starter_codes';
  info: {
    displayName: 'Starter Code';
    icon: 'alien';
  };
  attributes: {
    code: Attribute.Text;
    language: Attribute.Relation<
      'problem.starter-code',
      'oneToOne',
      'api::language.language'
    >;
  };
}

export interface TestsTestCases extends Schema.Component {
  collectionName: 'components_tests_test_cases';
  info: {
    displayName: 'Test Cases';
    icon: 'check';
    description: '';
  };
  attributes: {
    input: Attribute.Text;
    output: Attribute.Text;
    hidden: Attribute.Boolean;
    locked: Attribute.Boolean;
    weight: Attribute.Float & Attribute.Private;
  };
}

declare module '@strapi/types' {
  export module Shared {
    export interface Components {
      'problem.starter-code': ProblemStarterCode;
      'tests.test-cases': TestsTestCases;
    }
  }
}
