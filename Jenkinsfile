pipeline {
    agent any
    
    environment {
        DOCKER_HUB_USER = 'nguyenducmanh247'
        IMAGE_TAG = "latest"
        K8S_PATH = 'k8s'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
                echo "📂 Checked out source code"
            }
        }

        stage('Build & Push Docker Images') {
            steps {
                script {
                    withCredentials([usernamePassword(credentialsId: 'docker-hub', usernameVariable: 'DOCKER_USER', 
                    passwordVariable: 'DOCKER_PASS')]) {
                        sh "echo \$DOCKER_PASS | docker login -u \$DOCKER_USER --password-stdin"
                        def services = ['analytics', 'data-collection', 'device-control', 'gateway', 'mongodb', 'notification', 'ui-service']
                        services.each { svc ->
                            echo "🔧 Building and pushing image for: ${svc}"
                            sh "docker build -t ${DOCKER_HUB_USER}/energy-${svc}:${IMAGE_TAG} ./${svc}"
                            sh "docker push ${DOCKER_HUB_USER}/energy-${svc}:${IMAGE_TAG}"
                        }
                    }
                }
            }
        }
        
        stage('Deploy to Kubernetes') {
            steps {
                echo "🚀 Deploying all Kubernetes manifests from ${K8S_PATH}/"
                sh "kubectl apply -f ${K8S_PATH}/namespace.yaml"
                sh "kubectl apply -f ${K8S_PATH}/secrets.yaml"
                sh "kubectl apply -f ${K8S_PATH}/mongodb-pvc.yaml"
                sh "kubectl apply -f ${K8S_PATH}/redis-pvc.yaml"
                sh "kubectl apply -f ${K8S_PATH}/redis-configmap.yaml"
                sh "kubectl apply -f ${K8S_PATH}/"
                echo "✅ Deployment completed successfully"
            }
        }
        
        stage('Verify Deployment') {
            steps {
                script {
                    echo "🔍 Verifying deployment..."
                    sh "kubectl get pods -n ems"
                    sh "kubectl get services -n ems"
                }
            }
        }
    }
    
    post {
        success {
            echo "✅ CI/CD pipeline executed successfully!"
        }
        failure {
            echo "❌ CI/CD pipeline failed!"
        }
    }
}