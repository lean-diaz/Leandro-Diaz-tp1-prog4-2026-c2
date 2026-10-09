import { Component, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
// Sumamos ScannerQRCodeConfig al import
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
  
  // NUEVO: Signal para mostrar el error exacto de la cámara
  camaraError = signal<string>(''); 

  // NUEVO: Configuración para forzar la cámara trasera en la librería
  config: ScannerQRCodeConfig = {
    constraints: {
      video: { facingMode: { ideal: 'environment' } },
      audio: false
    }
  };

  constructor(private supabaseService: SupabaseService) {}

  async encenderCamara() {
    this.camaraError.set('');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.camaraError.set('Tu navegador no permite usar la cámara (Probablemente falte HTTPS o permisos en el sistema).');
      return;
    }

    try {
      // 1. CARGAMOS EL MOTOR ACÁ ADENTRO (Solo cuando tocamos el botón)
      LOAD_WASM().subscribe();

      // 2. Pedimos permiso forzado al celular
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      
      // 3. Apagamos este video temporal
      stream.getTracks().forEach(t => t.stop());

      // 4. Encendemos el escáner
      this.scanner.start();
    } catch (e: any) {
      this.camaraError.set(`Fallo la cámara: ${e.name} - ${e.message}`);
    }
  }

  // ... tus métodos onEvent, quemarTicket y volverAEscanear quedan EXACTAMENTE IGUAL.
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