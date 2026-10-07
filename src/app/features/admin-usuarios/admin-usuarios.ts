import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { SupabaseService } from '../../core/services/supabase'; // Chequeá la ruta

@Component({
  selector: 'app-admin-usuarios',
  standalone: true,
  imports: [DatePipe], // Para formatear la fecha
  templateUrl: './admin-usuarios.html',
  styleUrls: ['./admin-usuarios.css']
})
export class AdminUsuarios implements OnInit {
  private supabaseService = inject(SupabaseService);
  
  // Guardamos la lista de usuarios acá
  usuarios = signal<any[]>([]);
  isLoading = signal(true);

  ngOnInit() {
    this.cargarUsuarios();
  }

  // 1. Lectura de la tabla perfiles
  async cargarUsuarios() {
    this.isLoading.set(true);
    const { data, error } = await this.supabaseService.supabase
      .from('perfiles')
      .select('*')
      .order('created_at', { ascending: false }); // Los más nuevos primero
    
    if (data && !error) {
      this.usuarios.set(data);
    }
    this.isLoading.set(false);
  }

  // 2. Acción: Actualizar en Supabase
  async cambiarRol(usuario: any, event: any) {
    const nuevoRol = event.target.value; // Agarra el valor del <select>
    
    const { error } = await this.supabaseService.supabase
      .from('perfiles')
      .update({ rol: nuevoRol })
      .eq('id', usuario.id); // Busca por el ID único
      
    if (error) {
      console.error(error);
      alert('Error al actualizar el rol en la base de datos.');
      this.cargarUsuarios(); // Si falla, recarga la lista original
    }
  }
}