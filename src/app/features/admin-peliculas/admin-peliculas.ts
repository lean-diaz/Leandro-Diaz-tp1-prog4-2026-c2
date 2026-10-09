import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms'; // <-- FUNDAMENTAL PARA LOS FORMULARIOS
import { SupabaseService } from '../../core/services/supabase';

@Component({
  selector: 'app-admin-peliculas',
  standalone: true,
  imports: [FormsModule], // <-- NO TE OLVIDES DE ESTO
  templateUrl: './admin-peliculas.html',
  styleUrls: ['./admin-peliculas.css']
})
export class AdminPeliculas implements OnInit {
  private supabaseService = inject(SupabaseService);
  
  peliculas = signal<any[]>([]);
  isLoading = signal(true);
  
  // --- VARIABLES PARA EL CRUD ---
  mostrarFormulario = signal(false); // Controla si se ve o no el panel de agregar
  
  // Nuestro "molde" temporal donde se guardan los datos mientras escribís
  nuevaPelicula = {
    nombre: '',
    duracion_minutos: '',
    clasificacion: '',
    formatos_texto: '', // Lo pedimos como texto "2D, 3D" y luego lo convertimos
    idiomas_texto: '',  // "Castellano, Subtitulada"
    imagen_url: ''
  };

  ngOnInit() {
    this.cargarPeliculas();
  }

  async cargarPeliculas() {
    this.isLoading.set(true);
    const { data, error } = await this.supabaseService.supabase
      .from('peliculas')
      .select('*')
      .order('id', { ascending: true });
    
    if (data && !error) this.peliculas.set(data);
    this.isLoading.set(false);
  }

  // --- FUNCIÓN PARA CREAR EN BASE DE DATOS ---
  async guardarPelicula() {
    // 1. Convertimos los textos separados por coma en Arrays para Supabase
    const formatosArray = this.nuevaPelicula.formatos_texto.split(',').map(s => s.trim());
    const idiomasArray = this.nuevaPelicula.idiomas_texto.split(',').map(s => s.trim());

    // 2. Armamos el paquete exacto como lo espera tu tabla
    const peliInsertar = {
      nombre: this.nuevaPelicula.nombre,
      duracion_min: Number(this.nuevaPelicula.duracion_minutos), // Aseguramos que sea número
      clasificacion: this.nuevaPelicula.clasificacion,
      formatos: formatosArray,
      idiomas: idiomasArray,
      imagen_url: this.nuevaPelicula.imagen_url,
      es_preventa: false // Por defecto
    };

    // 3. Lo mandamos a Supabase
    const { error } = await this.supabaseService.supabase
      .from('peliculas')
      .insert(peliInsertar);

    if (error) {
      alert('Error al guardar: ' + error.message);
    } else {
      alert('¡Película agregada al catálogo!');
      this.mostrarFormulario.set(false); // Ocultamos el formulario
      this.cargarPeliculas(); // Recargamos la tabla para ver la nueva peli
      
      // Limpiamos los campos
      this.nuevaPelicula = { nombre: '', duracion_minutos: '', clasificacion: '', formatos_texto: '', idiomas_texto: '', imagen_url: '' };
    }
  }
}