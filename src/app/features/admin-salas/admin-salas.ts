import { Component, signal, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';

// Definimos el "molde" de cómo es una butaca
interface Butaca {
  id: string;
  fila: string;
  numero: number;
  tipo: 'normal' | 'vip' | 'accesible';
  estado: 'disponible' | 'ocupada' | 'mantenimiento';
}

@Component({
  selector: 'app-admin-salas',
  standalone: true,
  imports: [NgClass], // Necesario para pintar los colores dinámicamente
  templateUrl: './admin-salas.html',
  styleUrls: ['./admin-salas.css']
})

export class AdminSalas implements OnInit {
  // Acá guardamos todas las filas generadas
  filas = signal<{ letra: string; butacas: Butaca[] }[]>([]);

  ngOnInit() {
    this.generarSala();
  }

  generarSala() {
    // Abecedario hasta la T (20 filas)
    const letras = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T'];
    const asientosPorFila = 15; // Podés cambiar este número si querés la sala más ancha
    const mapa = [];

    for (let letra of letras) {
      const butacasFila: Butaca[] = [];
      
      for (let i = 1; i <= asientosPorFila; i++) {
        // Por defecto, todas son normales
        let tipo: 'normal' | 'vip' | 'accesible' = 'normal';
        
        // REGLAS DE NEGOCIO DEL EMPRESARIO:
        if (['J', 'K'].includes(letra)) tipo = 'accesible';
        if (['R', 'S', 'T'].includes(letra)) tipo = 'vip';

        butacasFila.push({
          id: `${letra}${i}`, // Ej: A1, A2, J5, T15
          fila: letra,
          numero: i,
          tipo: tipo,
          estado: 'disponible'
        });
      }
      mapa.push({ letra, butacas: butacasFila });
    }
    
    // Guardamos el mapa armado en el Signal
    this.filas.set(mapa);
  }

  // Función lista para cuando quieras deshabilitar una butaca rota en el futuro
  seleccionarButaca(butaca: Butaca) {
    console.log('Butaca clickeada en el admin:', butaca);
  }
}