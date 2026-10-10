import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})

export class Home implements OnInit {
  // Películas separadas por estado
  peliculasCartelera: any[] = [];
  peliculasProximamente: any[] = [];

  constructor(
    private supabaseService: SupabaseService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.cargarCartelera();
  }

  async cargarCartelera() {
    try {
      const { data, error } = await this.supabaseService.supabase
        .from('peliculas')
        .select('*');

      if (error) {
        throw error;
      }

      const peliculas = data ?? [];

      // Películas disponibles en la cartelera
      this.peliculasCartelera = peliculas.filter(
        p => p.estado === 'Cartelera' || !p.estado
      );

      // Películas que se estrenarán próximamente
      this.peliculasProximamente = peliculas.filter(
        p => p.estado === 'Próximamente'
      );

    } catch (error) {
      console.error('Error al cargar las películas:', error);
    } finally {
      this.cdr.detectChanges();
    }
  }
}
