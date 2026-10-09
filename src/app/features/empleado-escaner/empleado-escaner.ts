import { Component, signal, ViewChild, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { LOAD_WASM, NgxScannerQrcodeComponent, ScannerQRCodeConfig } from 'ngx-scanner-qrcode';
import { SupabaseService } from '../../core/services/supabase';

@Component({
  selector: 'app-empleado-escaner',
  standalone: true,
  imports: [CommonModule, NgxScannerQrcodeComponent],
  templateUrl: './empleado-escaner.html',
  styleUrls: ['./empleado-escaner.css']
})
export class EmpleadoEscaner {
  @ViewChild('action') scanner!: NgxScannerQrcodeComponent;

  ticketEscaneado = signal<any>(null);
  errorMsj = signal<string>('');
  procesando = signal<boolean>(false);
  
  esNavegador = false;

  config: ScannerQRCodeConfig = {
    constraints: {
      video: { facingMode: 'environment' }
    }
  };

  constructor(
    private supabaseService: SupabaseService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.esNavegador = isPlatformBrowser(this.platformId);
    
    // PRE-CARGA: Descargamos el motor acá, seguro y en silencio.
    // Así, cuando el usuario toque el botón, la cámara se abre al instante.
    if (this.esNavegador) {
      LOAD_WASM().subscribe();
    }
  }

  // Eliminamos la función encenderCamara() porque ahora la llamamos directo desde el HTML

  async onEvent(eventosDetectados: any, actionControl: any) {
    if (eventosDetectados && eventosDetectados.length > 0 && !this.procesando()) {
      const qrText = eventosDetectados[0].value;
      if (!qrText) return;

      actionControl.stop();
      this.procesando.set(true);
      this.errorMsj.set('');

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
      this.ticketEscaneado.set({ ...ticket, qr_usado: true });
    } else {
      alert('Hubo un error al quemar el ticket.');
    }
  }

  volverAEscanear() {
    this.ticketEscaneado.set(null);
    this.errorMsj.set('');
    // Al volver a escanear, la orden es directa y síncrona
    if (this.scanner) {
      this.scanner.start();
    }
  }
}