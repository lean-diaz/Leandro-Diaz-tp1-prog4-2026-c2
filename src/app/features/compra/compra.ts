import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DatePipe } from '@angular/common';
import { SupabaseService } from '../../core/services/supabase';

import { PrecioArsPipe } from '../../shared/pipes/precio-ars.pipe';
import { HighlightButacaDirective } from '../../shared/directives/highlight-butaca.directive';

@Component({
  selector: 'app-compra',
  standalone: true,
  imports: [DatePipe, PrecioArsPipe, HighlightButacaDirective],
  templateUrl: './compra.html',
  styleUrls: ['./compra.css']
})
export class Compra implements OnInit, OnDestroy {

  // =========================================================
  // 1. ESTADO (SIGNALS)
  // =========================================================
  peliculaSeleccionada = signal<any>(null);
  funciones = signal<any[]>([]);
  funcionSeleccionada = signal<any>(null);

  pasoActual = signal<number>(1);

  butacasSeleccionadas = signal<string[]>([]);
  butacasOcupadas = signal<string[]>([]);

  productosCandy = signal<any[]>([]);
  carritoCandy = signal<any[]>([]);

  descuentoAplicado = signal<number>(0); // Porcentaje (ej: 20)
  cuponAplicado = signal<string | null>(null); // Nombre del cupón

  // =========================================================
  // 2. CONSTANTES (no cambian nunca, no necesitan ser signals)
  // =========================================================
  filas: string[] = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T'];
  asientos: number[] = Array.from({ length: 28 }, (_, i) => i + 1);

  private readonly FILAS_VIP = ['R', 'S', 'T'];
  private readonly FILAS_ACCESIBLES = ['J', 'K'];
  private readonly RECARGO_VIP = 2000;

  // Canal de realtime, para poder cortarlo al cambiar de función o salir
  private realtimeChannel: any = null;

  constructor(
    private route: ActivatedRoute,
    private supabaseService: SupabaseService
  ) {}

  // =========================================================
  // 3. CICLO DE VIDA
  // =========================================================
  async ngOnInit() {
    const idUrl = this.route.snapshot.paramMap.get('id');
    if (!idUrl) return;

    try {
      const [pelicula, funciones, productos] = await Promise.all([
        this.supabaseService.getPeliculaById(idUrl),
        this.supabaseService.getFuncionesDePelicula(idUrl),
        this.supabaseService.getProductosCandy()
      ]);

      this.peliculaSeleccionada.set(pelicula);
      this.funciones.set(funciones);
      this.productosCandy.set(productos);
    } catch (error) {
      console.error('Error cargando datos iniciales:', error);
    }

  }

  ngOnDestroy() {
    this.cortarRealtime();
  }

  // =========================================================
  // 4. NAVEGACIÓN
  // =========================================================
  avanzarPaso(nuevoPaso: number) {
    this.pasoActual.set(nuevoPaso);
  }

  // =========================================================
  // 5. FUNCIÓN (HORARIO) Y BUTACAS
  // =========================================================
  async seleccionarFuncion(funcion: any) {
    this.funcionSeleccionada.set(funcion);
    this.butacasSeleccionadas.set([]);
    this.butacasOcupadas.set([]);

    try {
      // Butacas ya vendidas SOLO para esta función
      const { data, error } = await this.supabaseService.supabase
        .from('compras')
        .select('butacas')
        .eq('funcion_id', funcion.id);

      if (error) throw error;

      // Si mientras esperaba el usuario cambió de horario, descartamos este resultado
      if (this.funcionSeleccionada()?.id !== funcion.id) return;

      this.butacasOcupadas.set((data ?? []).flatMap(compra => compra.butacas));
    } catch (error) {
      console.error('Error cargando butacas ocupadas:', error);
    }

    this.iniciarRealtime(funcion.id);
  }

  toggleButaca(idButaca: string) {
    if (this.butacasOcupadas().includes(idButaca)) return; // seguridad extra

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

  // =========================================================
  // 6. REALTIME (WEBSOCKETS)
  // =========================================================
  private iniciarRealtime(funcionId: number) {
    // Cortamos el canal anterior para que no se acumulen
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

          // Si alguien nos ganó una butaca que teníamos seleccionada, la sacamos
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

  // =========================================================
  // 7. CANDY BAR
  // =========================================================
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

  // =========================================================
  // 8. TOTAL (COMPUTED)
  // =========================================================
  totalPagar = computed(() => {
    const funcion = this.funcionSeleccionada();
    if (!funcion) return 0;

    let totalParcial = 0;
    const precioButacaBase = funcion.precio_base;
    let cantidadButacas = this.butacasSeleccionadas().length;

    // 1. Sumar precio base de todas las butacas seleccionadas
    totalParcial += (precioButacaBase * cantidadButacas);

    // 2. Sumar recargos VIP (El combo descuenta la butaca base, pero si elegiste VIP, el recargo lo pagás igual)
    for (const asiento of this.butacasSeleccionadas()) {
      if (this.esVIP(asiento.charAt(0))) {
        totalParcial += this.RECARGO_VIP;
      }
    }

    // 3. Procesar el Candy Bar
    let combosConEntrada = 0;
    for (const item of this.carritoCandy()) {
      totalParcial += Number(item.precio); // Sumamos el precio del producto/combo
      
      // Si el producto incluye entrada, lo contamos
      if (item.incluye_entrada) {
        combosConEntrada++;
      }
    }

    // 4. Descontar butacas base (No podemos descontar más butacas de las que seleccionó)
    const butacasADescontar = Math.min(combosConEntrada, cantidadButacas);
    totalParcial -= (precioButacaBase * butacasADescontar);

    // 5. Aplicar cupón de descuento (si hay)
    const porcentaje = this.descuentoAplicado();
    if (porcentaje > 0) {
      const montoDescuento = (totalParcial * porcentaje) / 100;
      totalParcial = totalParcial - montoDescuento;
    }

    return totalParcial;
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

  // =========================================================
  // 9. CONFIRMACIÓN Y PAGO
  // =========================================================
  async finalizarCompra() {
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
      const resultado = await this.supabaseService.registrarCompra(paqueteBD);

      if (resultado.exito) {
        alert(`¡Compra confirmada! Tu número de ticket es el #${resultado.ticket.id}`);
        this.butacasSeleccionadas.set([]);
        this.carritoCandy.set([]);
        // Acá a futuro podemos navegar a una ruta de "ticket generado"
      } else {
        // Acá mostramos el mensaje de que le robaron la butaca
        alert(resultado.mensaje);
        
        // Volvemos al paso de selección de butacas para que elija otras
        this.avanzarPaso(2);
      }
    } catch (error) {
      console.error('Error al registrar la compra:', error);
      alert('Hubo un error al procesar el pago. Intentá de nuevo.');
    }
  }

  
}