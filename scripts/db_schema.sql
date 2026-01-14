-- Esquema de base de datos para Univia

CREATE TABLE courses (
  id TEXT PRIMARY KEY,
  code VARCHAR(10) UNIQUE,
  name VARCHAR(255),
  credits INT,
  description TEXT,
  ciclo INT,
  status VARCHAR(50),
  created_at TIMESTAMP
);

-- Tabla de estudiantes
CREATE TABLE students (
  id TEXT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  career VARCHAR(100),
  semester INT,
  created_at TIMESTAMP
);

CREATE TABLE learning_paths (
  id TEXT PRIMARY KEY,
  course_id TEXT REFERENCES courses(id),
  professor VARCHAR(255),
  progress INT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP
);

-- Tabla de inscripciones (enrollments)
CREATE TABLE enrollments (
  id TEXT PRIMARY KEY,
  student_id TEXT REFERENCES students(id),
  course_id TEXT REFERENCES courses(id),
  status VARCHAR(50), -- completed, in_progress, available, locked
  enrolled_at TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE TABLE resources (
  id TEXT PRIMARY KEY,
  title VARCHAR(255),
  code VARCHAR(10),
  type VARCHAR(50),
  ciclo INT,
  year INT,
  downloads INT,
  rating DECIMAL(3,1),
  created_at TIMESTAMP
);
