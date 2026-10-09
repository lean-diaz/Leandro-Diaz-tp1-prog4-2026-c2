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
  camaraError = signal<string>('');
  
  // EL SALVAVIDAS: Variable para saber si estamos en un navegador real
  esNavegador = false;

  // Forzamos que use la cámara de atrás
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
    
    // Solo cargamos el motor de la cámara si estamos en un navegador real (Evita el 504 de Vercel)
    if (this.esNavegador) {
      LOAD_WASM().subscribe();
    }
  }

  encenderCamara() {
    this.camaraError.set('');
    try {
      // Dejamos que la librería maneje el permiso de la cámara solita
      this.scanner.start();
    } catch (e: any) {
      this.camaraError.set(`Fallo la cámara: ${e.message}`);
    }
  }

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
    this.encenderCamara();
  }
}