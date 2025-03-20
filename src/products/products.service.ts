import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaClient } from '@prisma/client';
import { PaginationDto } from 'src/common/dto';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class ProductsService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('ProductsService');

  onModuleInit() {
    this.$connect();
    this.logger.log('Database connected');
  }

  create(createProductDto: CreateProductDto) {
    return this.product.create({
      data: createProductDto,
    });
  }

  async findAll(paginationDto: PaginationDto) {
    const { page, limit } = paginationDto;

    const totalPages = await this.product.count({ where: { available: true } });
    const lastPage = Math.ceil(totalPages / limit);

    return {
      data: await this.product.findMany({
        skip: (page - 1) * limit,
        take: limit,
        where: {
          available: true,
        },
      }),
      meta: {
        totalPages,
        page,
        lastPage,
      },
    };
  }

  async findOne(id: number) {
    const product = await this.product.findFirst({
      where: { id, available: true },
    });

    if (!product) {
      throw new RpcException({
        message: `Product with id ${id} not found`,
        status: HttpStatus.BAD_REQUEST,
      });
    }

    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    const { id: ___, ...data } = updateProductDto;
    // usamos esto para buscar y si no encuentra retorna error, podria hacerse con un try catch
    await this.findOne(id);

    // metodo para actualizar
    return this.product.update({
      where: { id },
      data,
    });
  }

  async remove(id: number) {
    // usamos esto para buscar y si no encuentra retorna error, podria hacerse con un try catch
    await this.findOne(id);

    /* return this.product.delete({
      where: { id }
    }) */
    return this.product.update({
      where: { id },
      data: {
        available: false,
      },
    });
  }

  async validateProducts(ids: number[]) {
    const idsCleared = Array.from(new Set(ids));

    const products = await this.product.findMany({
      where: {
        id: {
          in: idsCleared,
        },
      },
    });

    if (products.length !== ids.length) {
      throw new RpcException({
        message: 'Some products were not found',
        status: HttpStatus.BAD_REQUEST,
      });
    }

    return products;
  }
}
