CREATE TABLE users ( id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(255) NOT NULL UNIQUE, email VARCHAR(255) NOT NULL UNIQUE, password VARCHAR(255) NOT NULL, role ENUM('buyer', 'writer') NOT NULL );

CREATE TABLE writer_profiles ( id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id), bio TEXT, experience_level ENUM('beginner', 'intermediate', 'expert') NOT NULL, specialization ENUM('technology', 'health', 'education', 'finance', 'travel', 'lifestyle', 'other') NOT NULL, portfolio_url VARCHAR(255), hourly_rate DECIMAL(10, 2), available BOOLEAN DEFAULT TRUE );

CREATE TABLE buyer_profiles ( id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id), budget DECIMAL(10, 2) NOT NULL, project_type ENUM('technology', 'health', 'education', 'finance', 'travel', 'lifestyle', 'other') NOT NULL, project_description TEXT NOT NULL );

CREATE TABLE projects ( id INT AUTO_INCREMENT PRIMARY KEY, buyer_id INT NOT NULL, FOREIGN KEY (buyer_id) REFERENCES buyer_profiles(id), writer_id INT, FOREIGN KEY (writer_id) REFERENCES writer_profiles(id), title VARCHAR(255) NOT NULL, description TEXT NOT NULL, deadline DATE NOT NULL, status ENUM('pending', 'in progress', 'completed', 'cancelled') NOT NULL DEFAULT 'pending' );

CREATE TABLE messages ( id INT AUTO_INCREMENT PRIMARY KEY, sender_id INT NOT NULL, FOREIGN KEY (sender_id) REFERENCES users(id), recipient_id INT NOT NULL, FOREIGN KEY (recipient_id) REFERENCES users(id), project_id INT, FOREIGN KEY (project_id) REFERENCES projects(id), content TEXT NOT NULL, timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP );

CREATE TABLE forum_threads ( id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id), title VARCHAR(255) NOT NULL, content TEXT NOT NULL, timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP );

CREATE TABLE forum_posts ( id INT AUTO_INCREMENT PRIMARY KEY, thread_id INT NOT NULL, FOREIGN KEY (thread_id) REFERENCES forum_threads(id), user_id INT NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id), content TEXT NOT NULL, timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP )
CREATE TABLE applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    project_id INT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    status ENUM('pending', 'accepted', 'rejected') NOT NULL DEFAULT 'pending',
    application_text TEXT NOT NULL
);
;
-- Insert a buyer
INSERT INTO users (username, email, password, role)
VALUES ('john_doe', 'john.doe@example.com', 'password123', 'buyer');
-- Insert a writer
INSERT INTO users (username, email, password, role)
VALUES ('jane_doe', 'jane.doe@example.com', 'password123', 'writer');
-- Insert a writer profile
INSERT INTO writer_profiles (user_id, bio, experience_level, specialization, portfolio_url, hourly_rate, available)
VALUES (2, 'I am a professional writer with many years of experience.', 'expert', 'technology', 'https://jane-doe.com/portfolio', 50.00, true);
-- Insert a buyer profile
INSERT INTO buyer_profiles (user_id, budget, project_type, project_description)
VALUES (1, 1000.00, 'technology', 'I am looking for a developer to build a web application.');
-- Insert a project
INSERT INTO projects (buyer_id, title, description, deadline, status)
VALUES (1, 'Web Application Development', 'I am looking for a developer to build a web application for my business.', '2023-01-01', 'pending');
-- Insert a message
INSERT INTO messages (sender_id, recipient_id, project_id, content, timestamp)
VALUES (2, 1, 1, 'Hello John, I am interested in your project. Can we discuss the details?', NOW());
-- Insert a forum thread
INSERT INTO forum_threads (user_id, title, content, timestamp)
VALUES (2, 'How do I create a forum thread?', 'I am new to this forum and I would like to know how to create a new thread.', NOW());
-- Insert a forum post
INSERT INTO forum_posts (thread_id, user_id, content, timestamp)
VALUES (1, 1, 'To create a new forum thread, simply click on the "New Thread" button and fill out the form.', NOW());
  
