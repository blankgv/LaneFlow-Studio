import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';
import { TaskInstance } from '../models/task-instance.model';

@Injectable({ providedIn: 'root' })
export class TasksApiService {
  private readonly api = inject(ApiService);

  getAvailableTasks(): Observable<TaskInstance[]> {
    return this.api.get<TaskInstance[]>('/tasks/available');
  }

  getMyTasks(): Observable<TaskInstance[]> {
    return this.api.get<TaskInstance[]>('/tasks/my');
  }

  getTask(taskId: string): Observable<TaskInstance> {
    return this.api.get<TaskInstance>(`/tasks/${taskId}`);
  }

  claimTask(taskId: string): Observable<TaskInstance> {
    return this.api.post<TaskInstance>(`/tasks/${taskId}/claim`, {});
  }

  completeTask(taskId: string, variables: Record<string, unknown>): Observable<void> {
    return this.api.post<void>(`/tasks/${taskId}/complete`, { variables });
  }
}
