pipeline {

    agent any

    stages {

        stage('Checkout') {
            steps {
                echo 'Downloading source code from GitHub...'
                checkout scm
            }
        }

        stage('Test') {
            steps {
                bat '''
                if not exist app.py (
                    echo TEST FAILED: app.py is missing
                    exit /b 1
                )
                if not exist schema.sql (
                    echo TEST FAILED: schema.sql is missing
                    exit /b 1
                )
                if not exist templates\\index.html (
                    echo TEST FAILED: templates\\index.html is missing
                    exit /b 1
                )
                if not exist static\\app.js (
                    echo TEST FAILED: static\\app.js is missing
                    exit /b 1
                )
                if not exist static\\style.css (
                    echo TEST FAILED: static\\style.css is missing
                    exit /b 1
                )
                if not exist requirements.txt (
                    echo TEST FAILED: requirements.txt is missing
                    exit /b 1
                )
                echo TEST PASSED: Flask application files exist
                '''
            }
        }


        stage('Build') {
            steps {
                echo 'Building web application...'

                bat '''
                if not exist build mkdir build

                copy /Y app.py build\\
                if errorlevel 1 exit /b 1
                copy /Y schema.sql build\\
                if errorlevel 1 exit /b 1
                copy /Y requirements.txt build\\
                if errorlevel 1 exit /b 1
                xcopy /E /I /Y templates build\\templates
                if errorlevel 1 exit /b 1
                xcopy /E /I /Y static build\\static
                if errorlevel 1 exit /b 1
                '''
            }
        }

        stage('Deploy') {
            steps {
                echo 'Deploying application...'

                bat '''
                if not exist C:\\jenkins-deploy mkdir C:\\jenkins-deploy

                xcopy /E /I /Y build C:\\jenkins-deploy
                if errorlevel 1 exit /b 1
                '''
            }
        }
    }

    post {

        success {
            echo 'CI/CD Pipeline completed successfully!'
        }

        failure {
            echo 'CI/CD Pipeline failed!'
        }
    }
}
