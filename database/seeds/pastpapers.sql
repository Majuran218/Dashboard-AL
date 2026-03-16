-- SQL Server compatible seed data for past_papers table
-- Uses IDENTITY(1,1) for auto-increment
-- This file contains sample seed data for past papers

USE advanced_education_db;

-- Insert sample past papers data
-- Note: Since the table uses IDENTITY, we don't specify the id column

INSERT INTO past_papers (subject_id, year, paper_type, file_path, file_size, downloads_count, uploaded_by) VALUES
-- Pure Mathematics papers (subject_id = 1)
(1, 2023, 'Theory', '/uploads/pastpaper/math_pm_2023_theory.pdf', 2048576, 150, 1),
(1, 2023, 'MCQ', '/uploads/pastpaper/math_pm_2023_mcq.pdf', 512000, 120, 1),
(1, 2022, 'Theory', '/uploads/pastpaper/math_pm_2022_theory.pdf', 1945600, 200, 1),
(1, 2022, 'MCQ', '/uploads/pastpaper/math_pm_2022_mcq.pdf', 480000, 180, 1),
(1, 2021, 'Theory', '/uploads/pastpaper/math_pm_2021_theory.pdf', 1851392, 250, 1),

-- Applied Mathematics papers (subject_id = 2)
(2, 2023, 'Theory', '/uploads/pastpaper/math_am_2023_theory.pdf', 2097152, 140, 1),
(2, 2022, 'Theory', '/uploads/pastpaper/math_am_2022_theory.pdf', 1988608, 190, 1),
(2, 2021, 'Theory', '/uploads/pastpaper/math_am_2021_theory.pdf', 1769472, 220, 1),

-- Statistics papers (subject_id = 3)
(3, 2023, 'Theory', '/uploads/pastpaper/math_st_2023_theory.pdf', 1835008, 100, 1),
(3, 2022, 'Theory', '/uploads/pastpaper/math_st_2022_theory.pdf', 1720320, 150, 1),
(3, 2021, 'Theory', '/uploads/pastpaper/math_st_2021_theory.pdf', 1638400, 180, 1),

-- Biology papers (subject_id = 4)
(4, 2023, 'Theory', '/uploads/pastpaper/bio_2023_theory.pdf', 2359296, 300, 1),
(4, 2023, 'Practical', '/uploads/pastpaper/bio_2023_practical.pdf', 1572864, 250, 1),
(4, 2022, 'Theory', '/uploads/pastpaper/bio_2022_theory.pdf', 2228224, 350, 1),
(4, 2022, 'Practical', '/uploads/pastpaper/bio_2022_practical.pdf', 1441792, 300, 1),
(4, 2021, 'Theory', '/uploads/pastpaper/bio_2021_theory.pdf', 2097152, 400, 1),

-- Chemistry papers (subject_id = 5)
(5, 2023, 'Theory', '/uploads/pastpaper/chem_2023_theory.pdf', 2147488, 280, 1),
(5, 2023, 'Practical', '/uploads/pastpaper/chem_2023_practical.pdf', 1310720, 220, 1),
(5, 2022, 'Theory', '/uploads/pastpaper/chem_2022_theory.pdf', 2048000, 320, 1),
(5, 2021, 'Theory', '/uploads/pastpaper/chem_2021_theory.pdf', 1945600, 380, 1),

-- Physics papers (subject_id = 6)
(6, 2023, 'Theory', '/uploads/pastpaper/phy_2023_theory.pdf', 2293760, 290, 1),
(6, 2023, 'MCQ', '/uploads/pastpaper/phy_2023_mcq.pdf', 614400, 240, 1),
(6, 2022, 'Theory', '/uploads/pastpaper/phy_2022_theory.pdf', 2097152, 340, 1),
(6, 2021, 'Theory', '/uploads/pastpaper/phy_2021_theory.pdf', 1998848, 390, 1);
