import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule, Router } from '@angular/router';
import { SupabaseService } from './core/services/supabase';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App implements OnInit {
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);

  session = signal<any>(null);
  esAdmin = signal<boolean>(false);
  esEmpleado = signal<boolean>(false);

  ngOnInit() {
    this.supabaseService.supabase.auth.onAuthStateChange(async (event, session) => {
      this.session.set(session);
      
      if (session?.user) {
        const { data } = await this.supabaseService.supabase
          .from('usuarios')
          .select('es_admin, es_empleado')
          .eq('id', session.user.id)
          .maybeSingle();

        const isAdmin = session.user.email === 'profe@utn.edu.ar' || (data?.es_admin === true);
        this.esAdmin.set(isAdmin);
        this.esEmpleado.set((data?.es_empleado === true) || isAdmin);
      } else {
        this.esAdmin.set(false);
        this.esEmpleado.set(false);
      }
    });
  }

  async cerrarSesion() {
    await this.supabaseService.supabase.auth.signOut();
    this.router.navigate(['/']);
  }
}