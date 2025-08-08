/**
 * Utilidad para probar y gestionar la conexión con el backend
 */

interface BackendTestResult {
  success: boolean;
  message: string;
  data?: unknown;
  error?: string;
}

export class BackendConnection {
  private static backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

  /**
   * Prueba la conexión básica con el backend
   */
  static async testConnection(): Promise<BackendTestResult> {
    try {
      console.log('🔍 Probando conexión con backend:', this.backendUrl);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout
      
      const response = await fetch(`${this.backendUrl}/`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Conexión exitosa:', data);
        return {
          success: true,
          message: 'Conexión exitosa con el backend',
          data
        };
      } else {
        console.error('❌ Error HTTP:', response.status, response.statusText);
        return {
          success: false,
          message: `Error HTTP ${response.status}: ${response.statusText}`,
          error: `HTTP ${response.status}`
        };
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error('❌ Timeout en conexión con backend');
          return {
            success: false,
            message: 'Timeout: El backend no responde',
            error: 'TIMEOUT'
          };
        } else {
          console.error('❌ Error de red:', error.message);
          return {
            success: false,
            message: `Error de conexión: ${error.message}`,
            error: error.message
          };
        }
      } else {
        console.error('❌ Error desconocido:', error);
        return {
          success: false,
          message: 'Error desconocido',
          error: 'UNKNOWN'
        };
      }
    }
  }

  /**
   * Obtiene las opciones disponibles del backend
   */
  static async getOptions(): Promise<BackendTestResult> {
    try {
      console.log('🎨 Obteniendo opciones del backend...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos timeout
      
      const response = await fetch(`${this.backendUrl}/options`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Opciones obtenidas:', data);
        return {
          success: true,
          message: 'Opciones obtenidas exitosamente',
          data
        };
      } else {
        console.error('❌ Error HTTP en /options:', response.status, response.statusText);
        return {
          success: false,
          message: `Error HTTP ${response.status}: ${response.statusText}`,
          error: `HTTP ${response.status}`
        };
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error('❌ Timeout obteniendo opciones');
          return {
            success: false,
            message: 'Timeout obteniendo opciones del backend',
            error: 'TIMEOUT'
          };
        } else {
          console.error('❌ Error obteniendo opciones:', error.message);
          return {
            success: false,
            message: `Error obteniendo opciones: ${error.message}`,
            error: error.message
          };
        }
      } else {
        console.error('❌ Error desconocido obteniendo opciones:', error);
        return {
          success: false,
          message: 'Error desconocido obteniendo opciones',
          error: 'UNKNOWN'
        };
      }
    }
  }

  /**
   * Obtiene la URL base del backend
   */
  static getBackendUrl(): string {
    return this.backendUrl;
  }
}
