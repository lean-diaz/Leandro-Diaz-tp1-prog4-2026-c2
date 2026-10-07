import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
    selector: 'app-admin',
    standalone: true,
    imports: [RouterOutlet, RouterLink, RouterLinkActive], // <- IMPORTANTÍSIMO
    templateUrl: './admin.html',
    styleUrls: ['./admin.css']
})
export class Admin {
}