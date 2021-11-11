import {
  Entity,
  OneToOne,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { FileUpload } from './file-upload.entity';

@Entity()
export class Avatar {
  @PrimaryKey()
  avatarId!: number;

  @OneToOne()
  file!: FileUpload;

  // Date at which an avatar was replaced by a new one; if 'null', this avatar is the current avatar
  // TODO: Automatically update replacedAt of the last avatar when a new avatar is added
  @Property({ default: null })
  replacedAt: Date;

  constructor(options: {
    file: FileUpload;
  }) {
    this.file = options.file;
  }
}