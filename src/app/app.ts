import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, Router } from '@angular/router'; // Sumamos Router
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink], 
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})

export class App { // (O AppComponent, como lo hayas dejado)
  auth = inject(AuthService); 
  private router = inject(Router); // Inyectamos el motor de navegación

  // Nueva función que hace las dos cosas
  async cerrarSesion() {
    await this.auth.logout();      // 1. Rompe el pase VIP en Supabase
    this.router.navigate(['/']);   // 2. Te patea a la cartelera
  }
}