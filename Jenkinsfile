def gv

pipeline {
    agent any
    
    environment {
        DOCKER_HUB_USER = "nguyenducmanh247"
        IMAGE_TAG = "latest"
        K8S_PATH = "k8s"
    }
    
    stages {
        stage("Init") {
            steps {
                script {
                    gv = load "script.groovy"
                }
            }
        }
        
        stage("Checkout Code") {
            steps {
                script {
                    gv.checkoutCode()
                }
            }
        }

        stage("Build and Push Docker Images") {
            steps {
                script {
                    gv.buildAndPushDockerImages()
                }
            }
        }
        
        stage("Deploy to Kubernetes") {
            steps {
                script {
                    gv.deployToKubernetes()
                }
            }
        }
        
        stage("Verify Deployment") {
            steps {
                script {
                    gv.verifyDeployment()
                }
            }
        }
    }
    
    post {
        success {
            echo "CI/CD pipeline executed successfully!"
        }
        failure {
            echo "CI/CD pipeline failed!"
        }
    }
}