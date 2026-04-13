import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  imports: [RouterLink],
  templateUrl: './toast.html',
  styleUrls: ['./toast.scss'],
})
export class ToastComponent {
  protected readonly toastService = inject(ToastService);

  protected dismissToast(id: number): void {
    this.toastService.hide(id);
  }
}
