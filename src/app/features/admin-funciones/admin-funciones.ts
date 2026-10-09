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

  // Convierte un Date a string "YYYY-MM-DDTHH:mm:ss" en hora LOCAL (sin pasar por UTC)
  private aLocalISO(d: Date): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
  }

  async validarSolapamiento(salaId: number, nuevoInicio: Date, nuevoFin: Date): Promise<boolean> {
    const { data: funcionesEnSala } = await this.supabaseService.supabase
      .from('funciones')
      .select('fecha_hora, fecha_hora_fin')
      .eq('sala_id', salaId);

    if (!funcionesEnSala) return false;

    for (const f of funcionesEnSala) {
      // Como guardamos sin "Z", JS interpreta estos strings como hora local
      const inicioExistente = new Date(f.fecha_hora);
      const finExistente = new Date(f.fecha_hora_fin);

      if (nuevoInicio < finExistente && nuevoFin > inicioExistente) {
        return true; // CHOCAN
      }
    }
    return false; // VÍA LIBRE
  }

  async guardarFuncion() {
    if (!this.nuevaFuncion.pelicula_id || !this.nuevaFuncion.sala_id || !this.nuevaFuncion.fecha_hora) {
      alert('Por favor, completá todos los campos.');
      return;
    }

    // 1. Buscamos la película (usamos duracion_min, que es lo que traemos de Supabase)
    const peliSeleccionada = this.peliculas().find(p => p.id === this.nuevaFuncion.pelicula_id);
    const duracion = peliSeleccionada ? Number(peliSeleccionada.duracion_min) : 120;

    // 2. Matemática de fechas en hora local
    const inicioDate = new Date(this.nuevaFuncion.fecha_hora);
    const finDate = new Date(inicioDate);
    finDate.setMinutes(finDate.getMinutes() + duracion + 30); // duración + 30 min de limpieza

    // Validamos AMBAS fechas
    if (isNaN(inicioDate.getTime()) || isNaN(finDate.getTime())) {
      alert('Error en el cálculo de fechas.');
      return;
    }

    // 3. Validar solapamiento
    const salaIdNum = Number(this.nuevaFuncion.sala_id);
    const hayChoque = await this.validarSolapamiento(salaIdNum, inicioDate, finDate);

    if (hayChoque) {
      alert('❌ ERROR: La sala ya está ocupada en ese horario (incluyendo la limpieza). Elegí otra hora u otra sala.');
      return;
    }

    // 4. Guardar en Supabase con la hora local exacta
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
      this.mostrarFormulario.set(false);
      this.cargarDatos();
    }
  }
}