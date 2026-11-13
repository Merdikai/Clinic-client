import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PharmacyComponent } from './pharmacy.component';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

describe('PharmacyComponent', () => {
  let component: PharmacyComponent;
  let fixture: ComponentFixture<PharmacyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PharmacyComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        provideNoopAnimations()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PharmacyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
