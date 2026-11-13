import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { PatientStore } from './patient.store';

describe('PatientStore', () => {
  let store: InstanceType<typeof PatientStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        PatientStore
      ]
    });
    store = TestBed.inject(PatientStore);
  });

  it('should initialize with default pagination and search state', () => {
    expect(store.patients()).toEqual([]);
    expect(store.totalCount()).toBe(0);
    expect(store.currentPage()).toBe(1);
    expect(store.pageSize()).toBe(10);
    expect(store.searchTerm()).toBe('');
    expect(store.isLoading()).toBe(false);
    expect(store.error()).toBeNull();
    expect(store.totalPages()).toBe(0);
    expect(store.hasNext()).toBe(false);
    expect(store.hasPrevious()).toBe(false);
  });

  it('should update search term and reset page to 1 on setSearchTerm', () => {
    store.setPage(3);
    expect(store.currentPage()).toBe(3);

    store.setSearchTerm('John');
    expect(store.searchTerm()).toBe('John');
    expect(store.currentPage()).toBe(1);
  });

  it('should update page and pageSize correctly', () => {
    store.setPage(4);
    expect(store.currentPage()).toBe(4);

    store.setPageSize(25);
    expect(store.pageSize()).toBe(25);
    expect(store.currentPage()).toBe(1);
  });
});

