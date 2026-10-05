import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router'; // 1. Nueva herramienta importada
import { SupabaseService } from '../../core/services/supabase';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink], // 2. Agregada a los imports del componente
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})

export class Home implements OnInit {
  cartelera: any[] = [];
  
  constructor(
    private supabaseService: SupabaseService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    this.cartelera = await this.supabaseService.getPeliculas();
    this.cdr.detectChanges(); 
  }
}