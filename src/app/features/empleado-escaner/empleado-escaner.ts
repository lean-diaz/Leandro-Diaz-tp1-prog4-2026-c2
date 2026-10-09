import { Component, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LOAD_WASM, NgxScannerQrcodeComponent } from 'ngx-scanner-qrcode';
import { SupabaseService } from '../../core/services/supabase';

// Inicializamos el motor del escáner (Obligatorio para que ande rápido)
LOAD_WASM().subscribe();

@Component({
  selector: 'app-empleado-escaner',
  standalone: true,
  imports: [CommonModule, NgxScannerQrcodeComponent],
  templateUrl: './empleado-escaner.html',
  styleUrls: ['./empleado-escaner.css']
})
export class EmpleadoEscaner {
  // Con esto controlamos el componente del escáner desde el TS
  @ViewChild('action') scanner!: NgxScannerQrcodeComponent;

  ticketEscaneado = signal<any>(null);
  errorMsj = signal<string>('');
  procesando = signal<boolean>(false);

  constructor(private supabaseService: SupabaseService) {}

  // Esta función se dispara SOLA cuando la cámara detecta un QR
  async onEvent(eventosDetectados: any, actionControl: any) {
    // Verificamos que traiga datos válidos y que no estemos ya procesando uno
    if (eventosDetectados && eventosDetectados.length > 0 && !this.procesando()) {
      
      const qrText = eventosDetectados[0].value;
      
      if (!qrText) return; // Si leyó basura, ignoramos

      // Apagamos la cámara al instante para que no lea 20 veces el mismo QR
      actionControl.stop();

      this.procesando.set(true);
      this.errorMsj.set('');

      // Vamos a buscar el ticket a la BD
      const ticket = await this.supabaseService.getCompraPorId(qrText);

      if (ticket) {
        this.ticketEscaneado.set(ticket);
      } else {
        this.errorMsj.set('El código escaneado no existe en la base de datos.');
        this.ticketEscaneado.set(null);
      }
      this.procesando.set(false);
    }
  }

  async quemarTicket() {
    const ticket = this.ticketEscaneado();
    if (!ticket) return;

    const exito = await this.supabaseService.quemarTicket(ticket.id);
    
    if (exito) {
      alert('¡Ticket quemado y validado con éxito!');
      // Actualizamos el estado visual para que no lo puedan quemar dos veces
      this.ticketEscaneado.set({ ...ticket, qr_usado: true });
    } else {
      alert('Hubo un error al quemar el ticket.');
    }
  }

  volverAEscanear() {
    this.ticketEscaneado.set(null);
    this.errorMsj.set('');
    // Volvemos a prender la cámara
    this.scanner.start();
  }
}