import { Component, signal, ViewChild, ElementRef, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import jsQR from 'jsqr';
import { SupabaseService } from '../../core/services/supabase';

@Component({
  selector: 'app-empleado-escaner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './empleado-escaner.html',
  styleUrls: ['./empleado-escaner.css']
})
export class EmpleadoEscaner implements OnDestroy {
  @ViewChild('video') videoRef!: ElementRef<HTMLVideoElement>;

  ticketEscaneado = signal<any>(null);
  errorMsj = signal<string>('');
  procesando = signal<boolean>(false);
  camaraActiva = signal<boolean>(false);
  camaraError = signal<string>('');

  esNavegador = false;

  private stream: MediaStream | null = null;
  private rafId = 0;
  private canvas: HTMLCanvasElement | null = null;

  constructor(
    private supabaseService: SupabaseService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.esNavegador = isPlatformBrowser(this.platformId);
  }

  async iniciarCamara() {
    this.camaraError.set('');
    try {
      // Pedimos la cámara trasera directamente al celular
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });

      const video = this.videoRef.nativeElement;
      video.setAttribute('playsinline', 'true'); // Fundamental para iPhone
      video.muted = true;
      video.srcObject = this.stream;
      await video.play();

      this.camaraActiva.set(true);
      this.rafId = requestAnimationFrame(this.escanear);
    } catch (e: any) {
      this.camaraError.set(`Fallo al abrir cámara: ${e.message}`);
      this.detenerCamara();
    }
  }

  detenerCamara() {
    cancelAnimationFrame(this.rafId);
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
    }
    this.stream = null;
    this.camaraActiva.set(false);
  }

  // Se ejecuta milisegundo a milisegundo buscando el QR en el video
  private escanear = () => {
    if (!this.camaraActiva()) return;

    const video = this.videoRef.nativeElement;

    if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
      if (!this.canvas) this.canvas = document.createElement('canvas');
      const canvas = this.canvas;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // jsQR hace la magia acá
        const code = jsQR(img.data, img.width, img.height);

        if (code && code.data && !this.procesando()) {
          this.procesarQR(code.data);
          return; // Cortamos el escaneo
        }
      }
    }
    // Si no encontró nada, pide el siguiente frame
    this.rafId = requestAnimationFrame(this.escanear);
  };

  private async procesarQR(qrText: string) {
    this.detenerCamara();
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
    this.iniciarCamara();
  }

  ngOnDestroy() {
    this.detenerCamara();
  }
}