import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../core/services/supabase';

@Component({
  selector: 'app-admin-funciones',
  standalone: true,
  imports: [DatePipe, FormsModule],
  templateUrl: './admin-funciones.html',
  styleUrls: ['./admin-funciones.css']
})

export class AdminFunciones implements OnInit {
  // inyecto el servicio de supabase para comunicarme con la base de datos
  private supabaseService = inject(SupabaseService);

  funciones = signal<any[]>([]);
  peliculas = signal<any[]>([]);
  salas = [1, 2, 3];

  isLoading = signal(true);
  mostrarFormulario = signal(false);

  nuevaFuncion = {
    pelicula_id: '' as any,
    sala_id: '',
    fecha_hora: '',
    precio_base: ''
  };

  ngOnInit() {
    this.cargarDatos();
  }

  // consulto la base de datos para sincronizar funciones y películas al iniciar
  async cargarDatos() {
    this.isLoading.set(true);

    const { data: dataFunc } = await this.supabaseService.supabase
      .from('funciones')
      .select('*, peliculas ( nombre, duracion_min )')
      .order('fecha_hora', { ascending: true });

    if (dataFunc) this.funciones.set(dataFunc);

    const { data: dataPelis } = await this.supabaseService.supabase
      .from('peliculas')
      .select('id, nombre, duracion_min');

    if (dataPelis) this.peliculas.set(dataPelis);

    this.isLoading.set(false);
  }

  // transformo un objeto Date a formato ISO en hora local evitando desfases UTC
  private aLocalISO(d: Date): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
  }

  // realizo un chequeo para evitar cruces de horarios en una misma sala
  async validarSolapamiento(salaId: number, nuevoInicio: Date, nuevoFin: Date): Promise<boolean> {
    const { data: funcionesEnSala } = await this.supabaseService.supabase
      .from('funciones')
      .select('fecha_hora, fecha_hora_fin')
      .eq('sala_id', salaId);

    if (!funcionesEnSala) return false;

    for (const f of funcionesEnSala) {
      const inicioExistente = new Date(f.fecha_hora);
      const finExistente = new Date(f.fecha_hora_fin);

      // detecto si el intervalo de la nueva función se superpone con una existente
      if (nuevoInicio < finExistente && nuevoFin > inicioExistente) {
        return true;
      }
    }
    return false;
  }

  // valido los datos, calculo el fin con margen de limpieza y guardo la función
  async guardarFuncion() {
    if (!this.nuevaFuncion.pelicula_id || !this.nuevaFuncion.sala_id || !this.nuevaFuncion.fecha_hora) {
      alert('Por favor, completá todos los campos.');
      return;
    }

    // buscamos la película
    const peliSeleccionada = this.peliculas().find(p => p.id === this.nuevaFuncion.pelicula_id);
    const duracion = peliSeleccionada ? Number(peliSeleccionada.duracion_min) : 120;

    // calculo la hora de finalización sumando la duración y 30 minutos extras de limpieza
    const inicioDate = new Date(this.nuevaFuncion.fecha_hora);
    const finDate = new Date(inicioDate);
    finDate.setMinutes(finDate.getMinutes() + duracion + 30); // duración + 30 min de limpieza

    // valido ambas fechas
    if (isNaN(inicioDate.getTime()) || isNaN(finDate.getTime())) {
      alert('Error en el cálculo de fechas.');
      return;
    }

    // valido solapamiento
    const salaIdNum = Number(this.nuevaFuncion.sala_id);
    const hayChoque = await this.validarSolapamiento(salaIdNum, inicioDate, finDate);

    if (hayChoque) {
      alert('❌ ERROR: La sala ya está ocupada en ese horario (incluyendo la limpieza). Elegí otra hora u otra sala.');
      return;
    }

    // inserto el registro final en la tabla de supabase usando formatos locales
    const { error } = await this.supabaseService.supabase
      .from('funciones')
      .insert({
        pelicula_id: this.nuevaFuncion.pelicula_id,
        sala_id: salaIdNum,
        fecha_hora: this.aLocalISO(inicioDate),
        fecha_hora_fin: this.aLocalISO(finDate),
        precio_base: Number(this.nuevaFuncion.precio_base)
      });

    if (error) {
      alert('Error en la base de datos: ' + error.message);
    } else {
      alert('✅ Función programada con éxito en cartelera.');
      
      const nombrePelicula = peliSeleccionada ? peliSeleccionada.nombre : 'una película';
      await this.supabaseService.registrarAuditoria(`Programó una nueva función para: ${nombrePelicula}`); // Mandamos el registro a Supabase

      this.mostrarFormulario.set(false);
      this.cargarDatos();
    }
  }
}