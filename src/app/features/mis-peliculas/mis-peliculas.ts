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
    // verificamos quien está logueado
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

    // solo se puede cancelar si no paso la fecha de la funcion
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


  // averigua si la película ya paso
  esFuncionPasada(fechaHora: string): boolean {
    const fechaFuncion = new Date(fechaHora);
    const ahora = new Date();
    return fechaFuncion < ahora;
  }

  // crear reseña
  async dejarResena(compra: any) {
    const userId = this.usuarioLogueadoId();
    if (!userId) return;

    // buscamos el id de la peli en las diferentes estructuras posibles que devuelve supabase
    const peliculaId = compra.funciones?.peliculas?.id || compra.funciones?.pelicula?.id || compra.funciones?.pelicula_id;
    const peliculaNombre = compra.funciones?.peliculas?.nombre || compra.funciones?.pelicula?.nombre || 'esta película';
    

    if (!peliculaId) {
      console.error('Estructura de la compra:', compra);
      alert('Error interno: No se pudo identificar la película para dejar la reseña. Revisá la consola.');
      return;
    }

    const estrellasStr = prompt(`Del 1 al 5, ¿cuántas estrellas le darías a ${peliculaNombre}?`);
    if (!estrellasStr) return; 

    const estrellas = parseInt(estrellasStr, 10);
    if (isNaN(estrellas) || estrellas < 1 || estrellas > 5) {
      alert('Por favor, ingresá un número válido del 1 al 5.');
      return;
    }

    const comentario = prompt(`(Opcional) Dejá un breve comentario sobre ${peliculaNombre}:`);

    this.cargando.set(true);
    const resultado = await this.supabaseService.agregarResena(peliculaId, userId, estrellas, comentario || '');
    this.cargando.set(false);

    if (resultado.exito) {
      alert('¡Gracias por tu reseña! Ya está visible para otros usuarios.');
    } else {
      alert('Hubo un error al guardar la reseña: ' + resultado.mensaje);
    }
  }
}