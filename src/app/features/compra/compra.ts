import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DatePipe } from '@angular/common';
import { SupabaseService } from '../../core/services/supabase';
import { QRCodeComponent } from 'angularx-qrcode';

import { PrecioArsPipe } from '../../shared/pipes/precio-ars.pipe';
import { HighlightButacaDirective } from '../../shared/directives/highlight-butaca.directive';

@Component({
  selector: 'app-compra',
  standalone: true,
  imports: [DatePipe, PrecioArsPipe, HighlightButacaDirective, QRCodeComponent],
  templateUrl: './compra.html',
  styleUrls: ['./compra.css']
})
export class Compra implements OnInit, OnDestroy {

  // signals
  peliculaSeleccionada = signal<any>(null);
  funciones = signal<any[]>([]);
  funcionSeleccionada = signal<any>(null);
  ticketFinalId = signal<number | null>(null);

  pasoActual = signal<number>(1);

  butacasSeleccionadas = signal<string[]>([]);
  butacasOcupadas = signal<string[]>([]);

  productosCandy = signal<any[]>([]);
  carritoCandy = signal<any[]>([]);

  descuentoAplicado = signal<number>(0);
  cuponAplicado = signal<string | null>(null);

  puntosUsuario = signal<number>(0);

  resenasPelicula = signal<any[]>([]);

  // constantes
  filas: string[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T'];
  asientos: number[] = Array.from({ length: 28 }, (_, i) => i + 1);

  private readonly FILAS_VIP = ['R', 'S', 'T'];
  private readonly FILAS_ACCESIBLES = ['J', 'K'];
  private readonly RECARGO_VIP = 2000;

  // realtime para poder cortarlo al cambiar de función o salir
  private realtimeChannel: any = null;

  constructor(
    private route: ActivatedRoute,
    private supabaseService: SupabaseService
  ) { }

  // ciclo de vida
  async ngOnInit() {
    const idUrl = this.route.snapshot.paramMap.get('id');
    if (!idUrl) return;

    try {
      const [pelicula, funciones, productos, resenas] = await Promise.all([
        this.supabaseService.getPeliculaById(idUrl),
        this.supabaseService.getFuncionesDePelicula(idUrl),
        this.supabaseService.getProductosCandy(),
        this.supabaseService.getResenasPelicula(Number(idUrl))
      ]);

      this.peliculaSeleccionada.set(pelicula);
      this.funciones.set(funciones);
      this.productosCandy.set(productos);
      this.resenasPelicula.set(resenas);
    } catch (error) {
      console.error('Error cargando datos iniciales:', error);
    }

    // puntos del usuario para el club de beneficios
    try {
      const { data: authData } = await this.supabaseService.supabase.auth.getUser();
      if (authData.user) {
        const puntos = await this.supabaseService.getPuntosUsuario(authData.user.id);
        this.puntosUsuario.set(puntos);
      }
    } catch (error) {
      console.error('Error cargando puntos del usuario:', error);
    }
  }

  ngOnDestroy() {
    this.cortarRealtime();
  }

  // navegacion
  avanzarPaso(nuevoPaso: number) {
    this.pasoActual.set(nuevoPaso);
  }

  // funciones, horarias y butacas
  async seleccionarFuncion(funcion: any) {
    this.funcionSeleccionada.set(funcion);
    this.butacasSeleccionadas.set([]);
    this.butacasOcupadas.set([]);

    try {
      // butacas ya vendidas SOLO para esta función
      const { data, error } = await this.supabaseService.supabase
        .from('compras')
        .select('butacas')
        .eq('funcion_id', funcion.id);

      if (error) throw error;

      // si mientras esperaba el usuario cambio de horario, descartamos este resultado
      if (this.funcionSeleccionada()?.id !== funcion.id) return;

      this.butacasOcupadas.set((data ?? []).flatMap(compra => compra.butacas));
    } catch (error) {
      console.error('Error cargando butacas ocupadas:', error);
    }

    this.iniciarRealtime(funcion.id);
  }

  toggleButaca(idButaca: string) {
    if (this.butacasOcupadas().includes(idButaca)) return;

    this.butacasSeleccionadas.update(butacas =>
      butacas.includes(idButaca)
        ? butacas.filter(b => b !== idButaca)
        : [...butacas, idButaca]
    );
  }

  esVIP(fila: string): boolean {
    return this.FILAS_VIP.includes(fila);
  }

  esAccesible(fila: string): boolean {
    return this.FILAS_ACCESIBLES.includes(fila);
  }

  // realtime, websockets
  private iniciarRealtime(funcionId: number) {
    // cortamos el canal anterior para que no se acumulen
    this.cortarRealtime();

    this.realtimeChannel = this.supabaseService.supabase
      .channel(`compras-funcion-${funcionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'compras' },
        (payload: any) => {
          const nuevaCompra = payload.new;
  
          if (String(nuevaCompra['funcion_id']) !== String(funcionId)) return;

          const butacasNuevas: string[] = nuevaCompra['butacas'] ?? [];

          this.butacasOcupadas.update(ocupadas => [...ocupadas, ...butacasNuevas]);

          // si alguien nos gano una butaca que teniamos seleccionada, la sacamos
          this.butacasSeleccionadas.update(seleccionadas =>
            seleccionadas.filter(b => !butacasNuevas.includes(b))
          );
        }
      )
      .subscribe();
  }

  private cortarRealtime() {
    if (this.realtimeChannel) {
      this.supabaseService.supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }

  // candy bar
  agregarAlCandy(producto: any) {
    this.carritoCandy.update(carrito => [...carrito, producto]);
  }

  quitarDelCandy(productoId: number) {
    this.carritoCandy.update(carrito => {
      const index = carrito.findIndex(p => p.id === productoId);
      if (index === -1) return carrito;

      const nuevoCarrito = [...carrito];
      nuevoCarrito.splice(index, 1);
      return nuevoCarrito;
    });
  }

  getCantidadProducto(productoId: number): number {
    return this.carritoCandy().filter(p => p.id === productoId).length;
  }

  esPreventa = computed(() => {
    const funcion = this.funcionSeleccionada();
    if (!funcion) return false;

    const fechaFuncion = new Date(funcion.fecha_hora);
    if (!Number.isFinite(fechaFuncion.getTime())) return false;

    const diferenciaEnDias =
      (fechaFuncion.getTime() - Date.now()) / (1000 * 60 * 60 * 24);

    return diferenciaEnDias > 7;
  });

  // total (computed)
  totalPagar = computed(() => {
    const funcion = this.funcionSeleccionada();
    if (!funcion) return 0;

    const precioButacaBase = Number(funcion.precio_base);
    const cantidadButacas = this.butacasSeleccionadas().length;

    // butacas
    let totalParcial = precioButacaBase * cantidadButacas;

    // recargo vip
    for (const asiento of this.butacasSeleccionadas()) {
      if (this.esVIP(asiento.charAt(0))) {
        totalParcial += this.RECARGO_VIP;
      }
    }

    // candy bar
    let combosConEntrada = 0;
    for (const item of this.carritoCandy()) {
      totalParcial += Number(item.precio);
      if (item.incluye_entrada) combosConEntrada++;
    }

    // entradas incluidas en combos
    totalParcial -= precioButacaBase * Math.min(combosConEntrada, cantidadButacas);

    // cupon
    const porcentajeCupon = this.descuentoAplicado();
    if (porcentajeCupon > 0) {
      totalParcial -= totalParcial * porcentajeCupon / 100;
    }

    // preventa
    if (this.esPreventa()) {
      totalParcial *= 0.80;
    }

    return Math.max(0, Math.round(totalParcial * 100) / 100);
  });

  async aplicarDescuento(inputCodigo: string) {
    if (!inputCodigo) return;

    const cupon = await this.supabaseService.validarCupon(inputCodigo);

    if (cupon) {
      this.descuentoAplicado.set(cupon.porcentaje);
      this.cuponAplicado.set(cupon.codigo);
      alert(`¡Cupón aplicado! Tenés un ${cupon.porcentaje}% de descuento.`);
    } else {
      alert('El cupón ingresado no existe o ya no es válido.');
      this.descuentoAplicado.set(0);
      this.cuponAplicado.set(null);
    }
  }

  // confirmación y pago
  async finalizarCompra(metodoPago: 'tarjeta' | 'puntos' = 'tarjeta') {
    const funcion = this.funcionSeleccionada();
    if (!funcion || this.butacasSeleccionadas().length === 0) {
      alert('Elegí una función y al menos una butaca.');
      return;
    }

    const paqueteBD = {
      funcion_id: funcion.id,
      butacas: this.butacasSeleccionadas(),
      candy_bar: this.carritoCandy(),
      total_pagado: this.totalPagar()
    };

    try {
      const resultado = await this.supabaseService.registrarCompra(paqueteBD, metodoPago);

      if (resultado.exito) {
        // gardamos el id del ticket generado
        this.ticketFinalId.set(resultado.ticket.id);

        // limpiamos los carritos
        this.butacasSeleccionadas.set([]);
        this.carritoCandy.set([]);

        // avanza al qr
        this.avanzarPaso(5);

      } else {
        alert(resultado.mensaje);
        this.avanzarPaso(2);
      }
    } catch (error) {
      console.error('Error al registrar la compra:', error);
      alert('Hubo un error al procesar el pago. Intentá de nuevo.');
    }
  }
}