import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';
import { DynamicForm, FormField } from '../models/dynamic-form.model';
import { FieldPayload, FieldReorderItem, FormCreatePayload, FormUpdatePayload } from '../models/form-payload.model';

@Injectable({
  providedIn: 'root'
})
export class FormsApiService {
  private readonly api = inject(ApiService);

  getForms(workflowId: string): Observable<DynamicForm[]> {
    return this.api.get<DynamicForm[]>(`/forms?workflowId=${workflowId}`);
  }

  getFormByNode(workflowId: string, nodeId: string): Observable<DynamicForm> {
    return this.api.get<DynamicForm>(`/forms/by-node?workflowId=${workflowId}&nodeId=${encodeURIComponent(nodeId)}`);
  }

  createForm(payload: FormCreatePayload): Observable<DynamicForm> {
    return this.api.post<DynamicForm>('/forms', payload);
  }

  updateForm(formId: string, payload: FormUpdatePayload): Observable<DynamicForm> {
    return this.api.put<DynamicForm>(`/forms/${formId}`, payload);
  }

  deleteForm(formId: string): Observable<void> {
    return this.api.delete<void>(`/forms/${formId}`);
  }

  addField(formId: string, payload: FieldPayload): Observable<FormField> {
    return this.api.post<FormField>(`/forms/${formId}/fields`, payload);
  }

  reorderFields(formId: string, items: FieldReorderItem[]): Observable<DynamicForm> {
    return this.api.put<DynamicForm>(`/forms/${formId}/fields/reorder`, items);
  }
}
