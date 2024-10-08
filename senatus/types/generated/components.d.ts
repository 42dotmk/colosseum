import type { Struct, Schema } from '@strapi/strapi';

export interface TestsTestCases extends Struct.ComponentSchema {
  collectionName: 'components_tests_test_cases';
  info: {
    displayName: 'Test Cases';
    icon: 'check';
    description: '';
  };
  attributes: {
    input: Schema.Attribute.Text;
    output: Schema.Attribute.Text;
    hidden: Schema.Attribute.Boolean;
    locked: Schema.Attribute.Boolean;
    weight: Schema.Attribute.Float & Schema.Attribute.Private;
  };
}

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

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'tests.test-cases': TestsTestCases;
      'problem.starter-code': ProblemStarterCode;
    }
  }
}
