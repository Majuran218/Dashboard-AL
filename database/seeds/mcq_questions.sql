-- MCQ Questions Seed Data
-- This file contains sample MCQ questions for the database

USE advanced_education_db;

-- Insert sample MCQ questions
INSERT INTO mcq_questions (subject_id, topic, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty_level, year) VALUES
(1, 'Algebra', 'What is the value of x in the equation 2x + 5 = 15?', 'x = 5', 'x = 10', 'x = 7.5', 'x = 4', 'A', 'Subtract 5 from both sides: 2x = 10. Then divide by 2: x = 5', 'Easy', 2023),
(1, 'Calculus', 'What is the derivative of x²?', '2x', 'x²', '2x²', 'x', 'A', 'Using the power rule: d/dx(x^n) = nx^(n-1), so d/dx(x²) = 2x', 'Medium', 2023),
(1, 'Geometry', 'What is the area of a circle with radius 7cm? (Use π = 22/7)', '154 cm²', '44 cm²', '77 cm²', '22 cm²', 'A', 'Area = πr² = (22/7) × 7² = (22/7) × 49 = 154 cm²', 'Easy', 2023),
(1, 'Trigonometry', 'In a right triangle, if sin θ = 3/5, what is cos θ?', '3/5', '4/5', '5/3', '5/4', 'B', 'Using sin²θ + cos²θ = 1, cos²θ = 1 - (3/5)² = 1 - 9/25 = 16/25, so cos θ = 4/5', 'Medium', 2023),
(1, 'Statistics', 'What is the mean of the data set: 2, 4, 6, 8, 10?', '5', '6', '7', '4', 'B', 'Mean = (2+4+6+8+10)/5 = 30/5 = 6', 'Easy', 2023),
(2, 'Cell Biology', 'Which organelle is known as the powerhouse of the cell?', 'Nucleus', 'Mitochondria', 'Ribosome', 'Golgi apparatus', 'B', 'Mitochondria produce ATP through cellular respiration', 'Easy', 2023),
(2, 'Genetics', 'What is the complementary base pair for Adenine?', 'Guanine', 'Cytosine', 'Thymine', 'Uracil', 'C', 'In DNA, Adenine pairs with Thymine (A-T)', 'Easy', 2023),
(2, 'Human Anatomy', 'Which chamber of the heart receives oxygenated blood from the lungs?', 'Right atrium', 'Right ventricle', 'Left atrium', 'Left ventricle', 'C', 'The left atrium receives oxygenated blood from the pulmonary veins', 'Medium', 2023),
(2, 'Biochemistry', 'What is the primary function of hemoglobin?', 'Fight infections', 'Carry oxygen', 'Clot blood', 'Produce hormones', 'B', 'Hemoglobin in red blood cells binds to oxygen and transports it throughout the body', 'Easy', 2023),
(2, 'Ecology', 'What is the trophic level of producers in an ecosystem?', 'First level', 'Second level', 'Third level', 'Fourth level', 'A', 'Producers (plants) form the first trophic level as they convert sunlight to energy', 'Easy', 2023),
(3, 'World History', 'In which year did World War II end?', '1943', '1944', '1945', '1946', 'C', 'World War II ended in 1945 with the surrender of Japan', 'Easy', 2023),
(3, 'Geography', 'What is the capital of Australia?', 'Sydney', 'Melbourne', 'Canberra', 'Perth', 'C', 'Canberra is the capital of Australia, not Sydney', 'Medium', 2023),
(3, 'Political Science', 'What type of government does the United Kingdom have?', 'Republic', 'Constitutional Monarchy', 'Dictatorship', 'Theocracy', 'B', 'The UK is a constitutional monarchy with a parliamentary system', 'Easy', 2023),
(3, 'Economics', 'What is inflation?', 'Decrease in prices', 'Increase in general price levels', 'Stable prices', 'Deflation', 'B', 'Inflation is the rate at which the general level of prices for goods and services rises', 'Easy', 2023),
(3, 'Art', 'Which artist painted the Mona Lisa?', 'Michelangelo', 'Leonardo da Vinci', 'Raphael', 'Donatello', 'B', 'Leonardo da Vinci painted the Mona Lisa in the early 16th century', 'Easy', 2023);
