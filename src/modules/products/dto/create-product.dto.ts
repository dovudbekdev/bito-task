import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDecimal, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateProductDto {
    @ApiProperty({ example: 'Product 1', description: 'Product name' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiPropertyOptional({ example: 'Product 1 description', description: 'Product description' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ example: 10, description: 'Product quantity' })
    @IsNumber()
    @IsNotEmpty()
    quantity: number;

    @ApiProperty({ example: 100, description: 'Product cost price' })
    @IsDecimal()
    @IsNotEmpty()
    costPrice: number;

    @ApiProperty({ example: 100, description: 'Product unit price' })
    @IsDecimal()
    @IsNotEmpty()
    unitPrice: number;
}
