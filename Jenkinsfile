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
                echo 'Testing web application...'

                bat '''
                if exist index.html (
                    echo TEST PASSED: index.html exists
                ) else (
                    echo TEST FAILED
                    exit /b 1
                )
                '''
            }
        }

        stage('Build') {
            steps {
                echo 'Building web application...'

                bat '''
                if not exist build mkdir build

                copy index.html build\\
                copy styles.css build\\
                '''
            }
        }

        stage('Deploy') {
            steps {
                echo 'Deploying application...'

                bat '''
                if not exist C:\\jenkins-deploy mkdir C:\\jenkins-deploy

                copy /Y build\\index.html C:\\jenkins-deploy\\
                copy /Y build\\styles.css C:\\jenkins-deploy\\
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
