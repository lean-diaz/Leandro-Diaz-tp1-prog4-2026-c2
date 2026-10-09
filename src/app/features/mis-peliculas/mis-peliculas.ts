import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../core/services/supabase';

@Component({
  selector: 'app-mis-peliculas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mis-peliculas.html',
  styleUrls: ['./mis-peliculas.css']
})
export class MisPeliculas implements OnInit {
  private supabaseService = inject(SupabaseService);

  compras = signal<any[]>([]);
  cargando = signal(true);
  usuarioLogueadoId = signal<string | null>(null);

  async ngOnInit() {
    // 1. Verificamos quién está logueado
    const { data } = await this.supabaseService.supabase.auth.getUser();
    if (data.user) {
      this.usuarioLogueadoId.set(data.user.id);
      await this.cargarHistorial(data.user.id);
    } else {
      this.cargando.set(false);
    }
  }

  async cargarHistorial(userId: string) {
    const historial = await this.supabaseService.getMisCompras(userId);
    this.compras.set(historial);
    this.cargando.set(false);
  }

  async cancelarCompra(compra: any) {
    const userId = this.usuarioLogueadoId();
    if (!userId) return;

    // Solo se puede cancelar si no pasó la fecha de la función
    const fechaFuncion = new Date(compra.funciones.fecha_hora);
    const ahora = new Date();
    
    if (fechaFuncion < ahora) {
      alert('No podés cancelar entradas de una función que ya pasó.');
      return;
    }

    // ACÁ EL ARREGLO: usamos compra.total_pagado
    const confirmar = confirm(`¿Estás seguro de cancelar las entradas para ${compra.funciones.peliculas.nombre}? Se te devolverán $${compra.total_pagado} a tu saldo.`);
    
    if (confirmar) {
      this.cargando.set(true);
      // ACÁ TAMBIÉN: pasamos compra.total_pagado
      const resultado = await this.supabaseService.cancelarCompraYDevolverSaldo(compra.id, userId, compra.total_pagado);
      
      if (resultado.exito) {
        // Y ACÁ TAMBIÉN
        alert(`¡Cancelación exitosa! Se han acreditado $${compra.total_pagado} en tu cuenta.`);
        await this.cargarHistorial(userId); // Recargamos para que se vea como "cancelada"
      } else {
        alert('Hubo un error al cancelar: ' + resultado.mensaje);
      }
      this.cargando.set(false);
    }
  }


}