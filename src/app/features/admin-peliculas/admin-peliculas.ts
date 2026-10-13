import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms'; // <-- FUNDAMENTAL PARA LOS FORMULARIOS
import { SupabaseService } from '../../core/services/supabase';

@Component({
  selector: 'app-admin-peliculas',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admin-peliculas.html',
  styleUrls: ['./admin-peliculas.css']
})

export class AdminPeliculas implements OnInit {
  private supabaseService = inject(SupabaseService);
  
  peliculas = signal<any[]>([]);
  isLoading = signal(true);
  
  mostrarFormulario = signal(false); // controla si se ve o no el panel de agregar
  
  // molde temporal donde se guardan los datos
  nuevaPelicula = {
    nombre: '',
    duracion_minutos: '',
    clasificacion: '',
    formatos_texto: '',
    idiomas_texto: '',
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
    // convertimos los textos separados por , en arrays para supabase
    const formatosArray = this.nuevaPelicula.formatos_texto.split(',').map(s => s.trim());
    const idiomasArray = this.nuevaPelicula.idiomas_texto.split(',').map(s => s.trim());

    // armamos el paquete exacto como lo espera tu tabla
    const peliInsertar = {
      nombre: this.nuevaPelicula.nombre,
      duracion_min: Number(this.nuevaPelicula.duracion_minutos),
      clasificacion: this.nuevaPelicula.clasificacion,
      formatos: formatosArray,
      idiomas: idiomasArray,
      imagen_url: this.nuevaPelicula.imagen_url,
      es_preventa: false
    };

    // lo mandamos a supabase
    const { error } = await this.supabaseService.supabase
      .from('peliculas')
      .insert(peliInsertar);

    if (error) {
      alert('Error al guardar: ' + error.message);
    } else {
      alert('¡Película agregada al catálogo!');
      this.mostrarFormulario.set(false); // ocultamos el formulario
      this.cargarPeliculas(); // recargamos la tabla para ver la nueva peli
      
      // limpiamos los campos
      this.nuevaPelicula = { nombre: '', duracion_minutos: '', clasificacion: '', formatos_texto: '', idiomas_texto: '', imagen_url: '' };
    }
  }
}