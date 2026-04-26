import { FieldFileConfig, FieldType, FieldValidation } from './dynamic-form.model';

export interface FormCreatePayload {
  workflowDefinitionId: string;
  nodeId: string;
  nodeName: string;
  title: string;
}

export interface FormUpdatePayload {
  title: string;
}

export interface FieldPayload {
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  order: number;
  options: string[] | null;
  validations: FieldValidation[];
  fileConfig: FieldFileConfig | null;
}

export interface FieldReorderItem {
  fieldId: string;
  order: number;
}
