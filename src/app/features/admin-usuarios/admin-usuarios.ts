import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { SupabaseService } from '../../core/services/supabase';

@Component({
  selector: 'app-admin-usuarios',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './admin-usuarios.html',
  styleUrls: ['./admin-usuarios.css']
})

export class AdminUsuarios implements OnInit {
  private supabaseService = inject(SupabaseService);
  
  // guardamos la lista de usuarios
  usuarios = signal<any[]>([]);
  isLoading = signal(true);

  ngOnInit() {
    this.cargarUsuarios();
  }

  // lectura de la tabla perfiles
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

  // actualizar en supabase
  async cambiarRol(usuario: any, event: any) {
    const nuevoRol = event.target.value; // agarra el valor del <select>
    
    const { error } = await this.supabaseService.supabase
      .from('perfiles')
      .update({ rol: nuevoRol })
      .eq('id', usuario.id); // busca por el id unico
      
    if (error) {
      console.error(error);
      alert('Error al actualizar el rol en la base de datos.');
      this.cargarUsuarios(); // recarga la lista original
    }
  }
}