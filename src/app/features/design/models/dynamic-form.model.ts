export type FieldType =
  | 'TEXT'
  | 'TEXTAREA'
  | 'NUMBER'
  | 'DATE'
  | 'SELECT'
  | 'RADIO'
  | 'MULTISELECT'
  | 'CHECKBOX'
  | 'FILE'
  | 'IMAGE'
  | 'PHOTO'
  | 'AUDIO'
  | 'VIDEO'
  | 'DOCUMENT';

export interface FieldValidation {
  type: string;
  value: string;
  message: string;
}

export interface FieldFileConfig {
  allowedExtensions: string[];
  maxSizeMb: number;
  multiple: boolean;
  bucketFolder: string;
}

export interface FormField {
  id: string;
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  order: number;
  options: string[] | null;
  validations: FieldValidation[];
  fileConfig: FieldFileConfig | null;
}

export interface DynamicForm {
  id: string;
  workflowDefinitionId: string;
  nodeId: string;
  nodeName: string;
  title: string;
  fields: FormField[];
  createdAt: string;
  updatedAt: string;
}
