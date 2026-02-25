import type { Schema, Struct } from '@strapi/strapi';

export interface ProblemStarterCode extends Struct.ComponentSchema {
  collectionName: 'components_problem_starter_codes';
  info: {
    displayName: 'Starter Code';
    icon: 'alien';
  };
  attributes: {
    code: Schema.Attribute.Text;
    language: Schema.Attribute.Relation<'oneToOne', 'api::language.language'>;
  };
}

export interface TestsTestCases extends Struct.ComponentSchema {
  collectionName: 'components_tests_test_cases';
  info: {
    description: '';
    displayName: 'Test Cases';
    icon: 'check';
  };
  attributes: {
    hidden: Schema.Attribute.Boolean;
    input: Schema.Attribute.Text;
    locked: Schema.Attribute.Boolean;
    output: Schema.Attribute.Text;
    weight: Schema.Attribute.Float & Schema.Attribute.Private;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'problem.starter-code': ProblemStarterCode;
      'tests.test-cases': TestsTestCases;
    }
  }
}
