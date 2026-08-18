import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PatientFormComponent } from './patient-form.component';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

describe('PatientFormComponent', () => {
  let component: PatientFormComponent;
  let fixture: ComponentFixture<PatientFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientFormComponent],
      providers: [provideHttpClient(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(PatientFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
