export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "alertas": {
                  Row: {
                    "created_at": string | null,"existencias": number,"id": number,"leida": boolean,"producto_id": string,"punto_pedido": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string | null,"existencias": number,"id"?: never,"leida"?: boolean,"producto_id": string,"punto_pedido": number
                  }
                  Update: {
                    "created_at"?: string | null,"existencias"?: number,"id"?: never,"leida"?: boolean,"producto_id"?: string,"punto_pedido"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "alertas_producto_id_fkey"
      columns: ["producto_id"]
isOneToOne: false
      referencedRelation: "productos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alertas_producto_id_fkey"
      columns: ["producto_id"]
isOneToOne: false
      referencedRelation: "productos_a_pedir"
      referencedColumns: ["id"]
    }
                  ]
                },"movimientos": {
                  Row: {
                    "cantidad": number,"created_at": string,"existencias_antes": number,"existencias_despues": number,"id": number,"motivo": Database["public"]['Enums']["motivo_salida"] | null,"producto_id": string,"tipo": Database["public"]['Enums']["tipo_movimiento"],"usuario_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cantidad": number,"created_at"?: string,"existencias_antes": number,"existencias_despues": number,"id"?: never,"motivo"?: Database["public"]['Enums']["motivo_salida"] | null,"producto_id": string,"tipo": Database["public"]['Enums']["tipo_movimiento"],"usuario_id": string
                  }
                  Update: {
                    "cantidad"?: number,"created_at"?: string,"existencias_antes"?: number,"existencias_despues"?: number,"id"?: never,"motivo"?: Database["public"]['Enums']["motivo_salida"] | null,"producto_id"?: string,"tipo"?: Database["public"]['Enums']["tipo_movimiento"],"usuario_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "movimientos_producto_id_fkey"
      columns: ["producto_id"]
isOneToOne: false
      referencedRelation: "productos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movimientos_producto_id_fkey"
      columns: ["producto_id"]
isOneToOne: false
      referencedRelation: "productos_a_pedir"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movimientos_usuario_id_fkey"
      columns: ["usuario_id"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    }
                  ]
                },"perfiles": {
                  Row: {
                    "activo": boolean,"created_at": string | null,"id": string,"nombre": string,"rol": Database["public"]['Enums']["rol_usuario"],"usuario": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"created_at"?: string | null,"id": string,"nombre": string,"rol": Database["public"]['Enums']["rol_usuario"],"usuario": string
                  }
                  Update: {
                    "activo"?: boolean,"created_at"?: string | null,"id"?: string,"nombre"?: string,"rol"?: Database["public"]['Enums']["rol_usuario"],"usuario"?: string
                  }
                  Relationships: [
                    
                  ]
                },"productos": {
                  Row: {
                    "activo": boolean,"codigo": string,"created_at": string,"dado_baja_at": string | null,"dado_baja_por": string | null,"existencias": number,"id": string,"motivo_baja": string | null,"nombre": string,"punto_pedido": number,"unidad": Database["public"]['Enums']["unidad_medida"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"codigo": string,"created_at"?: string,"dado_baja_at"?: string | null,"dado_baja_por"?: string | null,"existencias"?: number,"id"?: string,"motivo_baja"?: string | null,"nombre": string,"punto_pedido": number,"unidad": Database["public"]['Enums']["unidad_medida"],"updated_at"?: string
                  }
                  Update: {
                    "activo"?: boolean,"codigo"?: string,"created_at"?: string,"dado_baja_at"?: string | null,"dado_baja_por"?: string | null,"existencias"?: number,"id"?: string,"motivo_baja"?: string | null,"nombre"?: string,"punto_pedido"?: number,"unidad"?: Database["public"]['Enums']["unidad_medida"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "productos_dado_baja_por_fkey"
      columns: ["dado_baja_por"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "historial_movimientos": {
                  Row: {
                    "cantidad": number | null,"codigo": string | null,"created_at": string | null,"existencias_antes": number | null,"existencias_despues": number | null,"id": number | null,"motivo": Database["public"]['Enums']["motivo_salida"] | null,"producto": string | null,"producto_id": string | null,"tipo": Database["public"]['Enums']["tipo_movimiento"] | null,"unidad": Database["public"]['Enums']["unidad_medida"] | null,"usuario": string | null,"usuario_id": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "movimientos_producto_id_fkey"
      columns: ["producto_id"]
isOneToOne: false
      referencedRelation: "productos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movimientos_producto_id_fkey"
      columns: ["producto_id"]
isOneToOne: false
      referencedRelation: "productos_a_pedir"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movimientos_usuario_id_fkey"
      columns: ["usuario_id"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    }
                  ]
                },"productos_a_pedir": {
                  Row: {
                    "codigo": string | null,"existencias": number | null,"id": string | null,"nombre": string | null,"punto_pedido": number | null,"unidad": Database["public"]['Enums']["unidad_medida"] | null
                  }
                  ComputedFields: never
                  Insert: {
                           "codigo"?: string | null,"existencias"?: number | null,"id"?: string | null,"nombre"?: string | null,"punto_pedido"?: number | null,"unidad"?: Database["public"]['Enums']["unidad_medida"] | null
                         }
                        Update: {
                           "codigo"?: string | null,"existencias"?: number | null,"id"?: string | null,"nombre"?: string | null,"punto_pedido"?: number | null,"unidad"?: Database["public"]['Enums']["unidad_medida"] | null
                         }
                        Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "actualizar_producto":
{ Args: { "p_id": string,"p_nombre": string,"p_punto_pedido": number,"p_unidad": Database["public"]['Enums']["unidad_medida"] }; Returns: {
              "activo": boolean,
"codigo": string,
"created_at": string,
"dado_baja_at": string | null,
"dado_baja_por": string | null,
"existencias": number,
"id": string,
"motivo_baja": string | null,
"nombre": string,
"punto_pedido": number,
"unidad": Database["public"]['Enums']["unidad_medida"],
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "productos"
        isOneToOne: true
        isSetofReturn: false
      } },
"dar_baja_producto":
{ Args: { "p_id": string,"p_motivo": string }; Returns: {
              "activo": boolean,
"codigo": string,
"created_at": string,
"dado_baja_at": string | null,
"dado_baja_por": string | null,
"existencias": number,
"id": string,
"motivo_baja": string | null,
"nombre": string,
"punto_pedido": number,
"unidad": Database["public"]['Enums']["unidad_medida"],
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "productos"
        isOneToOne: true
        isSetofReturn: false
      } },
"es_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"marcar_alertas_leidas":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"registrar_movimiento":
{ Args: { "p_cantidad": number,"p_motivo"?: Database["public"]['Enums']["motivo_salida"],"p_producto_id": string,"p_tipo": Database["public"]['Enums']["tipo_movimiento"] }; Returns: {
              "cantidad": number,
"created_at": string,
"existencias_antes": number,
"existencias_despues": number,
"id": number,
"motivo": Database["public"]['Enums']["motivo_salida"] | null,
"producto_id": string,
"tipo": Database["public"]['Enums']["tipo_movimiento"],
"usuario_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "movimientos"
        isOneToOne: true
        isSetofReturn: false
      } },
"registrar_producto":
{ Args: { "p_cantidad_inicial": number,"p_codigo": string,"p_nombre": string,"p_punto_pedido": number,"p_unidad": Database["public"]['Enums']["unidad_medida"] }; Returns: {
              "activo": boolean,
"codigo": string,
"created_at": string,
"dado_baja_at": string | null,
"dado_baja_por": string | null,
"existencias": number,
"id": string,
"motivo_baja": string | null,
"nombre": string,
"punto_pedido": number,
"unidad": Database["public"]['Enums']["unidad_medida"],
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "productos"
        isOneToOne: true
        isSetofReturn: false
      } },
"reporte_movimientos":
{ Args: { "p_desde"?: string,"p_hasta"?: string,"p_producto_id"?: string,"p_tipo"?: Database["public"]['Enums']["tipo_movimiento"] }; Returns: {
              "cantidad": number,"codigo": string,"existencias_antes": number,"existencias_despues": number,"fecha": string,"motivo": Database["public"]['Enums']["motivo_salida"],"producto": string,"tipo": Database["public"]['Enums']["tipo_movimiento"],"unidad": Database["public"]['Enums']["unidad_medida"],"usuario": string
            }[]
                           },
"resumen_existencias":
{ Args: Record<PropertyKey, never>; Returns: {
              "productos": number,"total": number,"unidad": Database["public"]['Enums']["unidad_medida"]
            }[]
                           },
"usuario_activo":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           }
          }
          Enums: {
            "motivo_salida": "venta"|"consumo_interno"|"retiro_autorizado","rol_usuario": "admin"|"operativo","tipo_movimiento": "inicial"|"entrada"|"salida","unidad_medida": "unidad"|"libra"|"kilogramo"|"litro"|"caja"|"paquete"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "motivo_salida": ["venta", "consumo_interno", "retiro_autorizado"],"rol_usuario": ["admin", "operativo"],"tipo_movimiento": ["inicial", "entrada", "salida"],"unidad_medida": ["unidad", "libra", "kilogramo", "litro", "caja", "paquete"]
          }
        }
} as const
