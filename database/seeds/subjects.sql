-- SQL Server compatible CREATE TABLE for subjects
-- Uses IDENTITY(1,1) instead of AUTO_INCREMENT
-- Uses VARCHAR(MAX) instead of TEXT
-- Uses BIT instead of BOOLEAN

USE advanced_education_db;

-- Insert subjects data (seed data for the subjects table)
INSERT INTO subjects (subject_name, stream_id, subject_code, description) VALUES
-- Mathematics stream (stream_id = 1)
('Pure Mathematics', 1, 'MATH-PM', 'Pure Mathematics including Calculus, Algebra, and Geometry'),
('Applied Mathematics', 1, 'MATH-AM', 'Applied Mathematics including Mechanics and Statistics'),
('Statistics', 1, 'MATH-ST', 'Statistics and Probability'),

-- BIO stream (stream_id = 2)
('Biology', 2, 'BIO-BIO', 'Biology including Cell Biology, Genetics, and Ecology'),
('Chemistry', 2, 'BIO-CHEM', 'Chemistry including Organic, Inorganic, and Physical Chemistry'),
('Physics', 2, 'BIO-PHY', 'Physics including Mechanics, Waves, and Electricity'),

-- Arts stream (stream_id = 3)
('History', 3, 'ART-HIS', 'World History and Historical Methods'),
('Geography', 3, 'ART-GEO', 'Physical and Human Geography'),
('Political Science', 3, 'ART-POL', 'Political Theory and Comparative Politics'),

-- Commerce stream (stream_id = 4)
('Accounting', 4, 'COM-ACC', 'Financial Accounting and Reporting'),
('Economics', 4, 'COM-ECO', 'Microeconomics and Macroeconomics'),
('Business Studies', 4, 'COM-BUS', 'Business Organization and Management'),

-- Bio Technology stream (stream_id = 5)
('Biotechnology', 5, 'BIOT-BIO', 'Biotechnology and Genetic Engineering'),
('Biochemistry', 5, 'BIOT-BCH', 'Biochemical Processes and Molecular Biology'),
('Microbiology', 5, 'BIOT-MIC', 'Microorganisms and Their Applications'),

-- Engineering Technology stream (stream_id = 6)
('Engineering Technology', 6, 'ET-ENG', 'Engineering Principles and Applications'),
('Science for Technology', 6, 'ET-SCI', 'Applied Science for Technological Solutions');
