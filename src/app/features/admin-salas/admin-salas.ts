import { Component, signal, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';

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
  imports: [NgClass], // para pintar los colores dinámicamente
  templateUrl: './admin-salas.html',
  styleUrls: ['./admin-salas.css']
})

export class AdminSalas implements OnInit {
  // guardamos todas las filas generadas
  filas = signal<{ letra: string; butacas: Butaca[] }[]>([]);

  ngOnInit() {
    this.generarSala();
  }

  generarSala() {
    const letras = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T'];
    const asientosPorFila = 15;
    const mapa = [];

    for (let letra of letras) {
      const butacasFila: Butaca[] = [];
      
      for (let i = 1; i <= asientosPorFila; i++) {
        // por defecto, todas son normales
        let tipo: 'normal' | 'vip' | 'accesible' = 'normal';
        
        // reglas de negocio
        if (['J', 'K'].includes(letra)) tipo = 'accesible';
        if (['R', 'S', 'T'].includes(letra)) tipo = 'vip';

        butacasFila.push({
          id: `${letra}${i}`,
          fila: letra,
          numero: i,
          tipo: tipo,
          estado: 'disponible'
        });
      }
      mapa.push({ letra, butacas: butacasFila });
    }
    
    // guardamos el mapa armado en el signal
    this.filas.set(mapa);
  }

  seleccionarButaca(butaca: Butaca) {
    console.log('Butaca clickeada en el admin:', butaca);
  }
}