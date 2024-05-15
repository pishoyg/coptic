/*  Marcion
    Copyright (C) 2009-2016 Milan Konvicka

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License along
    with this program; if not, write to the Free Software Foundation, Inc.,
    51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA. */

#include "mlibrarybranches.h"
#include "ui_mlibrarybranches.h"

MLibraryBranches::MLibraryBranches(QWidget *parent) :
    QWidget(parent),
    ui(new Ui::MLibraryBranches),
    popup(),popupTgz()
{
    ui->setupUi(this);

    a_addnew=popup.addAction(QIcon(":/new/icons/icons/add_item2.png"),tr("&add new root"));
    a_addcurr=popup.addAction(QIcon(":/new/icons/icons/add_item.png"),tr("a&dd to current"));
    a_del=popup.addAction(QIcon(":/new/icons/icons/stop.png"),tr("d&elete current"));
    popup.addSeparator();
    a_read=popup.addAction(QIcon(":/new/icons/icons/refresh.png"),tr("&refresh"));
    a_write=popup.addAction(QIcon(":/new/icons/icons/work.png"),tr("e&xecute"));

    a_tgz_new=popupTgz.addAction(QIcon(":/new/icons/icons/add_item.png"),tr("&add new item"));
    a_tgz_cr=popupTgz.addAction(QIcon(":/new/icons/icons/tgz.png"),tr("&create tarball"));
    a_tgz_examine=popupTgz.addAction(tr("&examine tarball"));
    a_tgz_del=popupTgz.addAction(QIcon(":/new/icons/icons/stop.png"),tr("&delete current"));
    a_tgz_remap=popupTgz.addAction(tr("&remap tarball"));
    popupTgz.addSeparator();
    a_tgz_ref=popupTgz.addAction(QIcon(":/new/icons/icons/refresh.png"),tr("re&fresh"));

    ui->treeAuthors->hideColumn(1);
    ui->treeCat->header()->setResizeMode(QHeaderView::ResizeToContents);
    ui->treeAuthors->header()->setResizeMode(QHeaderView::ResizeToContents);
    ui->treeTGZ->header()->setResizeMode(QHeaderView::ResizeToContents);

    ui->wdgTgzDir->init(m_msg(),tr("archive path"),QDir("library"),false);
    ui->wdgTgzDir->setRelativeToLibrary(true);

    readBranches(ui->treeCat);
    readAuthors();
    readTgzs();

    IC_SIZES
}

MLibraryBranches::~MLibraryBranches()
{
    delete ui;
}

MLibBranchItem * MLibraryBranches::findId(QTreeWidget * tree,unsigned int id)
{
    for(int x=0;x<tree->topLevelItemCount();x++)
    {
        MItemBase * ib((MItemBase *)tree->topLevelItem(x));
        if(ib->isCategory())
        {
            MLibBranchItem * i((MLibBranchItem *)ib),*fi;
            fi=findId(i,id);
            if(fi)
                return fi;
        }
    }
    return 0;
}

MLibBranchItem * MLibraryBranches::findId(MLibBranchItem * item,unsigned int id)
{
    if(item->_id==id)
        return item;
    else if(item->childCount()>0)
    {
        for(int x=0;x<item->childCount();x++)
        {
            MItemBase * ib((MItemBase *)item->child(x));
            if(ib->isCategory())
            {
                MLibBranchItem * i((MLibBranchItem *)ib),*fi;
                fi=findId(i,id);
                if(fi)
                    return fi;
            }
        }
    }

    return 0;
}

void MLibraryBranches::readBranches(QTreeWidget * tree,bool search,int select_id)
{
    m_msg()->MsgMsg(tr("reading library branches ..."));
    tree->clear();
    QString query("select `id`,`name`,`branch` from `library_branch` order by `ord`");
    MQUERY(q,query)

    MLibBranchItem * sel_branch(0);
    while(q.next())
    {
        int new_id(q.value(0).toInt());
        MLibBranchItem * i(new MLibBranchItem(new_id,MLibBranchItem::Unchanged,false));
        QFont f(i->font(0));
        f.setBold(true);
        i->setFont(0,f);

        if(search)
        {
            i->setFlags(i->flags()|Qt::ItemIsUserCheckable);
            i->setCheckState(0,Qt::Unchecked);
        }

        if(select_id!=-1&&select_id==new_id)
            sel_branch=i;

        QString query2("select count(*) from `library_archive` where `category`="+QString::number(i->_id));
        MQUERY_GETFIRST(q2,query2)

        i->_arch_items=q2.value(0).toUInt();
        i->_name=q.value(1);
        i->setText(search);
        if(q.isNULL(2))
        {
            i->_isTop=true;
            i->_branch=0;
            tree->addTopLevelItem(i);
        }
        else
        {
            i->_branch=q.value(2).toInt();
            MLibBranchItem * bi;
            bi=findId(tree,i->_branch);
            if(bi)
                bi->addChild(i);
            else
            {
                i->setIcon(0,QIcon(":/new/icons/icons/exclam.png"));
                i->_isTop=true;
                tree->addTopLevelItem(i);
            }
        }
    }
    tree->expandAll();
    if(sel_branch)
    {
        tree->clearSelection();
        tree->setCurrentItem(sel_branch);
        sel_branch->setSelected(true);
    }
    m_msg()->MsgOk();
}

void MLibraryBranches::on_btClose_clicked()
{
    emit closeManager();
}

void MLibraryBranches::on_btExec_clicked()
{
    writeBranches();
    //accept();
}

void MLibraryBranches::writeItem(MLibBranchItem * item,bool init) const
{
    static int ord(0);
    if(init)
    {
        ord=0;
        return;
    }

    ord++;
    MLibBranchItem * pi(item->parent());
    switch(item->_status)
    {
    case MLibBranchItem::New :
    {
        QString txtid("null");
        if(pi)
            txtid=QString::number(pi->_id);
        QString query("insert into `library_branch` (`name`,`branch`,`ord`) values ('"+item->_name+"',"+txtid+","+QString::number(ord)+")")/*,query2("select last_insert_id()")*/;
        MQUERY(q,query)
        /*MQUERY_GETFIRST(q2,query2)*/
        item->_id=(unsigned int)q.lastInsertId();
        m_msg()->MsgOk();
        break;
    }
    case MLibBranchItem::Deleted :
    {
        QString query("delete from `library_branch` where `id`="+QString::number(item->_id));
        MQUERY(q,query)
        m_msg()->MsgOk();

        break;
    }
    case MLibBranchItem::Unchanged :
    {
        QString oquery("update `library_branch` set `ord`="+QString::number(ord)+" where `id`="+QString::number(item->_id));
        MQUERY(oq,oquery)
        m_msg()->MsgOk();

        if(pi)
        {
            if(pi->_id!=item->_branch||item->_isTop)
            {
                QString query("update `library_branch` set `branch`="+QString::number(pi->_id)+" where `id`="+QString::number(item->_id));
                MQUERY(q,query)
                m_msg()->MsgOk();
            }
        }
        else
        {
            QString query("update `library_branch` set `branch`=null where `id`="+QString::number(item->_id));
            MQUERY(q,query)
            m_msg()->MsgOk();
        }
        break;
    }
    case MLibBranchItem::Modified :
    {
        QString txtid("null");
        if(pi)
            txtid=QString::number(pi->_id);
        QString query("update `library_branch` set `name`='"+item->_name+"',`branch`="+txtid+",`ord`="+QString::number(ord)+" where `id`="+QString::number(item->_id));
        MQUERY(q,query)
        m_msg()->MsgOk();
        break;
    }
    }

    if(item->childCount()>0)
        for(int x=0;x<item->childCount();x++)
            writeItem((MLibBranchItem *)item->child(x));
}

void MLibraryBranches::writeBranches()
{
    writeItem(0,true);
    for(int x=0;x<ui->treeCat->topLevelItemCount();x++)
    {
        MLibBranchItem * i((MLibBranchItem *)ui->treeCat->topLevelItem(x));
        writeItem(i);
    }
    readBranches(ui->treeCat);
    emit categoriesChanged();
}

void MLibraryBranches::on_btDel_clicked()
{
    MLibBranchItem * i((MLibBranchItem*)ui->treeCat->currentItem());
    if(i)
    {
        if(i->_arch_items==0)
        {
            if(i->childCount()==0)
            {
                if(!i->_status==MLibBranchItem::New)
                {
                    i->_status=MLibBranchItem::Deleted;
                    i->setText();
                }
                else
                {
                    if(i->parent())
                        i->parent()->takeChild(i->parent()->indexOfChild(i));
                    else
                        ui->treeCat->takeTopLevelItem(ui->treeCat->indexOfTopLevelItem(i));
                }
            }
            else
            {
                i->_status=MLibBranchItem::Deleted;
                i->setText();
            }
        }
        else
            m_msg()->MsgWarn(tr("Only empty categories can be deleted."));
    }
}

void MLibraryBranches::on_btAdd_2_clicked()
{
    MLibBranchItem * item(new MLibBranchItem(0,MLibBranchItem::New,true));
    item->_name=tr("new category");
    item->setText();
    ui->treeCat->addTopLevelItem(item);
}

void MLibraryBranches::on_btAdd_clicked()
{
    MLibBranchItem * ci((MLibBranchItem *)ui->treeCat->currentItem());
    if(ci)
    {
        MLibBranchItem * item(new MLibBranchItem(0,MLibBranchItem::New,false));
        item->_name=tr("new category");
        item->setText();
        ci->addChild(item);
        ui->treeCat->expandItem(ci);
        ui->treeCat->setCurrentItem(item);
    }
}

void MLibraryBranches::on_btRefresh_clicked()
{
    readBranches(ui->treeCat);
}

void MLibraryBranches::on_btUpdate_clicked()
{
    MLibBranchItem * i((MLibBranchItem*)ui->treeCat->currentItem());
    if(i)
    {
        switch(i->_status)
        {
        case MLibBranchItem::New :
            break;
        case MLibBranchItem::Unchanged :
            i->_status=MLibBranchItem::Modified;
            break;
        case MLibBranchItem::Modified :
            break;
        case MLibBranchItem::Deleted :
            break;
        }

        i->_name=ui->txtName->text();
        i->setText();
    }
}

void MLibraryBranches::on_treeCat_currentItemChanged(QTreeWidgetItem* current, QTreeWidgetItem* )
{
    if(current)
    {
        MLibBranchItem * i((MLibBranchItem*)current);
        ui->txtName->setText(i->_name);
    }
    else
        ui->txtName->clear();
}

void MLibraryBranches::on_txtName_returnPressed()
{
    on_btUpdate_clicked();
}

void MLibraryBranches::on_treeCat_customContextMenuRequested(QPoint )
{
    QAction *a=popup.exec(QCursor::pos());
    if(a)
    {
        if(a==a_addnew)
            on_btAdd_2_clicked();
        else if(a==a_addcurr)
            on_btAdd_clicked();
        else if(a==a_del)
            on_btDel_clicked();
        else if(a==a_read)
            readBranches(ui->treeCat);
        else if(a==a_write)
            writeBranches();
    }
}

void MLibraryBranches::on_btUpdate_2_clicked()
{
    MAuthorItem * i((MAuthorItem*)ui->treeAuthors->currentItem());
    if(i)
    {
        QString query("update `library_author` set `author`='"+ui->txtAuthor->text()+"' where `id`="+QString::number(i->_id));
        MQUERY(q,query)
        m_msg()->MsgOk();
        readAuthors();
    }
}

void MLibraryBranches::on_btRefresh_2_clicked()
{
    readAuthors();
}

void MLibraryBranches::on_btDel_2_clicked()
{
    MAuthorItem * i((MAuthorItem*)ui->treeAuthors->currentItem());
    if(i)
    {
        if(i->_used==0)
        {
            QString query("delete from `library_author` where `id`="+QString::number(i->_id));
            MQUERY(q,query)
            m_msg()->MsgOk();
            readAuthors();
        }
        else
            m_msg()->MsgWarn(tr("only unreferenced items can be deleted!"));
    }
}

void MLibraryBranches::on_btAdd_3_clicked()
{
    QString query("insert into `library_author` (`author`) values ('new author')");
    MQUERY(q,query)
    m_msg()->MsgOk();
    readAuthors();
}

void MLibraryBranches::on_txtAuthor_returnPressed()
{
    on_btUpdate_2_clicked();
}

void MLibraryBranches::readTgzs()
{
    USE_CLEAN_WAIT

    ui->treeTGZ->clear();
    on_treeTGZ_currentItemChanged(0,0);
    ui->txtTgzTitle->clear();
    ui->wdgTgzDir->setTargetDir(QString("library"));

    QString query("select `id`,`tgz_title`,`bytes`,`tgz_path` from `library_data` where `type`=2 order by `tgz_title`");

    MQUERY(q,query)
    while(q.next())
    {
        unsigned int id(q.value(0).toUInt());
        MTgzItem * i(new MTgzItem(q.value(1),
                                  q.value(3),
                                  q.value(2).toUInt(),
                                  id));
        QString query2("select count(*) from `library_archive` where `data_id`="+QString::number(id));
        MQUERY_GETFIRST(q2,query2)
        i->_used=q2.value(0).toUInt();
        i->setText();
        ui->treeTGZ->addTopLevelItem(i);
    }

    m_msg()->MsgOk();
}

void MLibraryBranches::readAuthors()
{
    ui->treeAuthors->clear();
    QString query("select `id`,`author` from `library_author` order by `author`");
    MQUERY(q,query)
    while(q.next())
    {
        MAuthorItem * item(new MAuthorItem(q.value(1),q.value(0).toUInt()));
        QString query2("select count(*) from `library_archive` where `author`="+QString::number(item->_id));
        MQUERY_GETFIRST(q2,query2)
        item->_used=q2.value(0).toUInt();
        item->setText();
        ui->treeAuthors->addTopLevelItem(item);
    }
    m_msg()->MsgOk();
}

void MLibraryBranches::on_treeAuthors_currentItemChanged(QTreeWidgetItem* current, QTreeWidgetItem* )
{
    if(current)
        ui->txtAuthor->setText(((MAuthorItem*)current)->_text);
}

void MLibraryBranches::removeTgzItem(MTgzItem * i)
{
    //MTgzItem * i((MTgzItem *)ui->treeTGZ->currentItem());
    if(i)
    {
        if(i->_used==0)
        {
            QMessageBox mb(QMessageBox::Question,tr("remove item"),tr("Item '")+i->_title+tr("' will be removed from database. Continue?"),QMessageBox::Ok|QMessageBox::Cancel,this);
            if(mb.exec()==QMessageBox::Ok)
            {
                QString query("delete from `library_data` where `id`="+QString::number(i->_id));
                MQUERY(q,query)

                m_msg()->MsgOk();
                readTgzs();
            }
        }
        else
            m_msg()->MsgWarn(tr("only unreferenced items can be deleted!"));
    }
    else
        m_msg()->MsgWarn(tr("no item selected"));
}

void MLibraryBranches::newTgzItem()
{
    QString query("insert into `library_data` (`tgz_title`,`tgz_path`,`type`) values ('(new item)','library',2)");
    MQUERY(q,query)
    m_msg()->MsgOk();
    readTgzs();
}

void MLibraryBranches::createTarball(MTgzItem * i)
{
    if(i)
    {
        if(i->_used>0)
        {
            m_msg()->MsgErr(tr("only unreferenced items can manipulate with data!"));
            return;
        }

        if(i->_bytes>0)
        {
            QMessageBox mb(QMessageBox::Question,tr("create tarball"),tr("Item '")+i->_title+tr("' contains data already. Continue?"),QMessageBox::Ok|QMessageBox::Cancel,this);
            if(mb.exec()==QMessageBox::Cancel)
                return;
        }

        MCreateArchive ca(i->_title,i->_path);
        if(ca.exec()==QDialog::Accepted)
        {
            QString const mainpath(QString(QString("^")+QRegExp::escape(CTranslit::normSep(QFileInfo(ca.tgzPath()).path()+"/"))));
            m_msg()->MsgMsg(tr("creating tarball, directory '")+ca.tgzPath()+tr("' (strip '")+mainpath+"') ...");

            if(ca.items.count()>0)
            {
                USE_CLEAN_WAIT

                QString tmpfile(m_sett()->tmpDir()+QDir::separator()+"marcion_last.tgz");

                m_msg()->MsgMsg(tr("creating temporary tarball '")+tmpfile+"' ...");

                QStringList warns,errs;

                struct archive *a;
                struct archive_entry *entry;
                char buff[0xfff];
                int len;

                a = archive_write_new();
                if(!a)
                {
                    m_msg()->MsgErr(tr("cannot initialize tar archive"));
                    return;
                }

                CProgressDialog pd;
                pd.initProgress(tr("creating tarball ..."),ca.items.count());
                pd.show();

                int e;
                e=archive_write_set_compression_gzip(a);
                if(e!=ARCHIVE_OK)
                {
                    m_msg()->MsgErr(tr("cannot set archive compression (errno ")+QString::number(archive_errno(a))+")\n\n"+QString(archive_error_string(a)));
                    archive_write_finish(a);
                    return;
                }
                e=archive_write_set_format_ustar(a);
                if(e!=ARCHIVE_OK)
                {
                    m_msg()->MsgErr(tr("cannot set archive format (errno ")+QString::number(archive_errno(a))+")\n\n"+QString(archive_error_string(a)));
                    archive_write_finish(a);
                    return;
                }

                e=archive_write_open_filename(a, tmpfile.toUtf8().data());
                if(e!=ARCHIVE_OK)
                {
                    m_msg()->MsgErr(tr("cannot open archive file (errno ")+QString::number(archive_errno(a))+")\n\n"+QString(archive_error_string(a)));
                    archive_write_finish(a);
                    return;
                }

                for(int x=0;x<ca.items.count();x++)
                {
                    if(pd.stopped())
                    {
                        pd.close();
                        archive_write_close(a);
                        archive_write_finish(a);
                        m_msg()->MsgInf(tr("progress interrupted"));
                        return;
                    }
                    pd.incProgress();

                    MCrArItem * ai(ca.items.at(x));

                    if(ai->_err)
                    {
                        QString warn(tr("item ")+QString::number(x+1)+" '"+ai->_path+tr("' is marked as invalid, skipped"));
                        warns.append(warn);
                        m_msg()->MsgMsg(warn);
                    }

                    QString final_name(CTranslit::normSep(ai->_path));
                    final_name.remove(QRegExp(mainpath));

                    m_msg()->MsgMsg(tr("adding item ")+QString::number(x+1)+" '"+ai->_path+tr("' as '")+final_name+"' ...");
                    int dtype(0);
                    if(S_ISDIR(ai->_perm))
                        dtype=AE_IFDIR;
                    else if(S_ISREG(ai->_perm))
                        dtype=AE_IFREG;
#ifndef Q_WS_WIN
                    else if(S_ISLNK(ai->_perm))
                        dtype=AE_IFLNK;
#endif
                    else
                    {
                        QString warn(tr("unsupported file type, skipped (item ")+QString::number(x+1)+")");
                        warns.append(warn);
                        m_msg()->MsgMsg(warn);
                        continue;
                    }

                    entry = archive_entry_new();
                    if(!entry)
                    {
                        m_msg()->MsgMsg(tr("cannot allocate new entry (item ")+QString::number(x+1)+")");
                        continue;
                    }

                    archive_entry_set_pathname(entry,final_name.toUtf8().data());
                    archive_entry_set_size(entry, ai->_size);
                    archive_entry_set_filetype(entry, dtype);
                    archive_entry_set_perm(entry, ai->_perm);
                    e=archive_write_header(a, entry);
                    if(e!=ARCHIVE_OK)
                    {
                        if(e==ARCHIVE_RETRY||e==ARCHIVE_FATAL)
                        {
                            QString err(tr("cannot write header (item ")+QString::number(x+1)+") (errno "+QString::number(archive_errno(a))+")\n\n"+QString(archive_error_string(a)));
                            errs.append(err);
                            m_msg()->MsgMsg(err);
                            archive_entry_free(entry);
                            continue;
                        }
                        else if(e==ARCHIVE_WARN)
                        {
                            QString warn(tr("warning (item ")+QString::number(x+1)+") (errno "+QString::number(archive_errno(a))+")\n\n"+QString(archive_error_string(a)));
                            warns.append(warn);
                            m_msg()->MsgMsg(warn);
                        }
                    }

                    if(dtype!=AE_IFDIR)
                    {
                        QFile rf(ai->_path);
                        if(rf.open(QIODevice::ReadOnly))
                        {
                            len=rf.read(buff, sizeof(buff));
                            if(len==-1)
                            {
                                QString err(tr("cannot read from file '")+ai->_path+tr("' (item ")+QString::number(x+1)+")");
                                errs.append(err);
                                m_msg()->MsgMsg(err);
                            }
                            ssize_t awe;
                            while ( len > 0 ) {
                                awe=archive_write_data(a, buff, len);
                                if(awe==-1)
                                {
                                    QString err(tr("cannot write to archive (item ")+QString::number(x+1)+")\n\n"+QString(archive_error_string(a)));
                                    errs.append(err);
                                    m_msg()->MsgMsg(err);
                                    break;
                                }

                                len = rf.read(buff, sizeof(buff));
                                if(len==-1)
                                {
                                    QString err(tr("cannot read from file '")+ai->_path+tr("' (item ")+QString::number(x+1)+")");
                                    errs.append(err);
                                    m_msg()->MsgMsg(err);
                                    break;
                                }
                            }
                            rf.close();
                        }
                        else
                        {
                            QString err(tr("cannot open file '")+ai->_path+tr("' for reading (item ")+QString::number(x+1)+")");
                            errs.append(err);
                            m_msg()->MsgMsg(err);
                        }
                    }
                    archive_entry_free(entry);
                }

                archive_write_close(a);
                archive_write_finish(a);

                pd.close();

                if(errs.count()>0)
                {
                    QString errsmsg(errs.join("\n"));
                    m_msg()->MsgMsg(tr("\nErrors: ")+QString::number(errs.count())+"\n"+errsmsg);
                }
                if(warns.count()>0)
                {
                    QString warnmsg(errs.join("\n"));
                    m_msg()->MsgMsg(tr("\nWarnings: ")+QString::number(warns.count())+"\n"+warnmsg);
                }

                m_msg()->MsgInf(tr("temporary tarball created, errors: ")+QString::number(errs.count())+tr(", warnings: ")+QString::number(warns.count()));

                m_msg()->MsgInf(tr("importing file '")+tmpfile+tr("' into database (update)"));

                CMySql q;
                size_t bytes(0);
                QString output;
                e=q.fileToBlob("update `library_data` set `bytes`=",",`data`='",QString("',`tgz_path`='"+CTranslit::escaped(ca.tgzPath())+"' where `id`="+QString::number(i->_id)).toUtf8().data(),tmpfile,output,bytes);

                if(e==0)
                {
                    m_msg()->MsgInf(output);
                    i->_bytes=bytes;
                    i->_path=ca.tgzPath();
                    i->setText();
                    if(ui->treeTGZ->currentItem()==i)
                        on_treeTGZ_currentItemChanged(i,0);
                }
                else
                    m_msg()->MsgErr(output);
            }
            else
                m_msg()->MsgErr(tr("tree is empty!"));
        }
    }
}

void MLibraryBranches::on_btAddTGZ_clicked()
{
    newTgzItem();
}

void MLibraryBranches::on_btDelTGZ_clicked()
{
    removeTgzItem((MTgzItem *)ui->treeTGZ->currentItem());
}

void MLibraryBranches::on_treeTGZ_customContextMenuRequested(QPoint )
{
    MTgzItem * item=(MTgzItem *)ui->treeTGZ->currentItem();
    a_tgz_cr->setEnabled(item);
    a_tgz_del->setEnabled(item);
    a_tgz_examine->setEnabled(item);
    a_tgz_remap->setEnabled(item&&item->_used>0);

    QAction *a=popupTgz.exec(QCursor::pos());
    if(a)
    {
        if(a==a_tgz_new)
            newTgzItem();
        else if(a==a_tgz_cr)
            createTarball(item);
        else if(a==a_tgz_del)
            removeTgzItem(item);
        else if(a==a_tgz_ref)
            readTgzs();
        else if(a==a_tgz_examine)
            examineTgz(item);
        else if(a==a_tgz_remap)
            remapTgz(item);
    }
}

void MLibraryBranches::on_btCrTgz_clicked()
{
    createTarball((MTgzItem *)ui->treeTGZ->currentItem());
}

void MLibraryBranches::on_treeTGZ_currentItemChanged(QTreeWidgetItem* current, QTreeWidgetItem* )
{
    MTgzItem * item((MTgzItem *)current);
    if(item)
    {
        ui->txtTgzTitle->setText(item->_title);
        ui->wdgTgzDir->setTargetDir(item->_path);
        ui->wdgTgzDir->setEnabled(!item->_used>0);
        /*if(item->_used>0)
            ui->wdgTgzDir->showMessage(tr("only unreferenced items can change path!"));*/
    }
    else
    {
        ui->txtTgzTitle->clear();
        ui->wdgTgzDir->setEnabled(false);
        ui->wdgTgzDir->setTargetDir(QString("library"));
    }

    ui->txtTgzTitle->setEnabled(item);
    ui->btCrTgz->setEnabled(item);
    ui->btDelTGZ->setEnabled(item);
    ui->btUpdTitle->setEnabled(item);
}

void MLibraryBranches::on_btUpdTitle_clicked()
{
    MTgzItem * item=(MTgzItem *)ui->treeTGZ->currentItem();
    if(item)
    {
        bool is_same=(QString::compare(item->_path,ui->wdgTgzDir->targetDir(),Qt::CaseSensitive)==0);
        if(item->_used>0&&!is_same)
        {
            m_msg()->MsgErr(tr("only unreferenced items can change path!"));
            on_treeTGZ_currentItemChanged(item,0);
            return;
        }

        /*QString prevdir(QFileInfo(item->_path).fileName()),
                curdir(QFileInfo(wdgTgzDir->targetDir()).fileName());
        if(!is_same&&item->_bytes>0&&QString::compare(prevdir,curdir,Qt::CaseSensitive)!=0)
        {
            m_msg()->MsgErr(tr("this item contains data already, root directory '")+prevdir+tr(""));
            on_treeTGZ_currentItemChanged(item,0);
            return;
        }*/

        QString query("update `library_data` set `tgz_title`='"+ui->txtTgzTitle->text()+"'");
        if(!is_same)
            query.append(QString(",`tgz_path`='")+ui->wdgTgzDir->targetDir()+"'");
        query.append(QString(" where `id`=")+QString::number(item->_id));
        MQUERY(q,query)
        item->_title=ui->txtTgzTitle->text();
        if(!is_same)
            item->_path=ui->wdgTgzDir->targetDir();
        item->setText();
        m_msg()->MsgOk();
    }
}

void MLibraryBranches::slot_tgz_remapped(unsigned int id)
{
    on_btRefreshTgz_clicked();
    MTgzItem * si(0);
    for(int x=0;x<ui->treeTGZ->topLevelItemCount();x++)
    {
        MTgzItem * i((MTgzItem *)ui->treeTGZ->topLevelItem(x));
        if(i->_id==id)
            si=i;
    }
    if(si)
    {
        ui->treeTGZ->setCurrentItem(si);
        si->setSelected(true);
    }
}

void MLibraryBranches::slot_reloadTgzs()
{
    readTgzs();
}

void MLibraryBranches::slot_reloadCats()
{
    m_msg()->MsgMsg(windowTitle()+tr(": refresh categories"));
    readBranches(ui->treeCat);
}

void MLibraryBranches::slot_reloadAuths()
{
    m_msg()->MsgMsg(windowTitle()+tr(": refresh authors"));
    readAuthors();
}

void MLibraryBranches::on_btRefreshTgz_clicked()
{
    m_msg()->MsgMsg(windowTitle()+tr(": refresh tarballs"));
    readTgzs();
}

void MLibraryBranches::examineTgz(MTgzItem * item) const
{
    //QString query("select `data`,`bytes` from `library_data` where `id`="+QString::number(item->_id));

    MArchiver * ma=new MArchiver(item->_id,item->_title,false);
    if(ma->isValid())
        ma->show();
    else
        delete ma;
}

void MLibraryBranches::remapTgz(MTgzItem * item)
{
    if(item->_used>0)
    {
        MRemapTgz * rtgz(new MRemapTgz(item->_id,item->_path,item->_title));
        if(rtgz)
        {
            connect(rtgz,SIGNAL(remapped(unsigned int)),this,SLOT(slot_tgz_remapped(unsigned int)));
            rtgz->show();
        }
    }
}

void MLibraryBranches::on_txtTgzTitle_returnPressed()
{
    on_btUpdTitle_clicked();
}

// MItemBase

MItemBase::MItemBase()
    : QTreeWidgetItem(QTreeWidgetItem::UserType)
{

}

// MLibBranchItem

MLibBranchItem::MLibBranchItem(int item_id,MLibBranchItem::Status status,bool is_top)
    :
      MItemBase(),
      _id((unsigned int)item_id),
      _branch(0),
      _name(),
      _status(status),
      _type(Standard),
      _arch_items(0),
      _isTop(is_top)
{

}

MLibBranchItem::MLibBranchItem(MLibBranchItem const & other)
    :
      _id(other._id),
      _branch(other._branch),
      _name(other._name),
      _status(other._status),
      _type(other._type),
      _arch_items(other._arch_items),
      _isTop(other._isTop)

{
    //setText();
}

void MLibBranchItem::setText(bool search)
{
    /*QString s(" "+_name);
    for(int x=0;x<_level;x++)
        s.prepend("->");
    s.append(QObject::tr(", status: "));*/
    if(!search)
        switch(_status)
        {
        case MLibBranchItem::New :
            QTreeWidgetItem::setText(1,QObject::tr("NEW"));
            break;
        case MLibBranchItem::Deleted :
            QTreeWidgetItem::setText(1,QObject::tr("DELETED"));
            break;
        case MLibBranchItem::Unchanged :
            QTreeWidgetItem::setText(1,QObject::tr("UNCHANGED"));
            break;
        case MLibBranchItem::Modified :
            QTreeWidgetItem::setText(1,QObject::tr("MODIFIED"));
            break;
        }
    QTreeWidgetItem::setText(0,QString(_name+" ("+QString::number(_arch_items)+")"));
}

MLibBranchItem * MLibBranchItem::parent() const
{
    return (MLibBranchItem *)QTreeWidgetItem::parent();
}

// MAuthorItem

MAuthorItem::MAuthorItem(QString const & text,unsigned int id)
    : QTreeWidgetItem(QTreeWidgetItem::UserType),
      _id(id),
      _used(0),
      _text(text)
{

}

void MAuthorItem::setText()
{
    QTreeWidgetItem::setText(0,QString(_text+" ("+QString::number(_used)+")"));
}

// MArchiveItem

MArchiveLibItem::MArchiveLibItem()
    :
      MItemBase(),
      _id(0),
      _author(0),
      _category(0),
      _data(0),
      _workT(),
      _authorT(),
      _target(),
      _tgz_title(),
      _category_is_null(false),
      _author_is_null(false),
      _data_is_null(true),
      _index_count(0),
      _index_count_diff(0),
      _data_size(0),
      _ind_lat(0),
      _ind_gk(0),
      _ind_heb(0),
      _ind_cop(0),
      _data_type(MArchiveLibItem::NoData)
{

}

/*MArchiveLibItem::MArchiveLibItem(QString const & work,
                           QString const & author,
                           unsigned int id,
                           unsigned int author_id,
                           unsigned int category,
                           QString const & target)
    :QTreeWidgetItem(0),
      _id(id),
      _author(author_id),
      _category(category),
      _workT(),
      _authorT(),
      _target(target),
      _category_is_null(false),
      _author_is_null(false)
{

}*/

void MArchiveLibItem::setText()
{
    QTreeWidgetItem::setText(0,_workT);
    QTreeWidgetItem::setToolTip(0,_target);
    QTreeWidgetItem::setText(1,_authorT);
    QTreeWidgetItem::setText(2,QString::number(_data_size)+" B");

    if(_index_count_diff>0)
    {
        QString indtxt(QString::number(_index_count)+QObject::tr(" words, ")+QString::number(_index_count_diff)+QObject::tr(" diff | "));
        if(_ind_lat>0)
            indtxt.append(" Lat:"+QString::number(((double)_ind_lat/(double)_index_count_diff)*100,'g',4)+"%");
        if(_ind_gk>0)
            indtxt.append(" Gk:"+QString::number(((double)_ind_gk/(double)_index_count_diff)*100,'g',4)+"%");
        if(_ind_cop>0)
            indtxt.append(" Cop:"+QString::number(((double)_ind_cop/(double)_index_count_diff)*100,'g',4)+"%");
        if(_ind_heb>0)
            indtxt.append(" Hebr:"+QString::number(((double)_ind_heb/(double)_index_count_diff)*100,'g',4)+"%");

        QTreeWidgetItem::setText(3,indtxt);
        QTreeWidgetItem::setToolTip(3,indtxt);
    }
    else
    {
        QTreeWidgetItem::setText(3,QObject::tr("no index"));
        QTreeWidgetItem::setToolTip(3,QTreeWidgetItem::text(3));
    }

    if(_data_is_null)
        QTreeWidgetItem::setIcon(2,QIcon(":/new/icons/icons/uncheck.png"));
    else
    {
        switch(_data_type)
        {
        case NoData :
            QTreeWidgetItem::setIcon(2,QIcon(":/new/icons/icons/uncheck.png"));
            break;
        case OneFile :
            QTreeWidgetItem::setIcon(2,QIcon(":/new/icons/icons/greencheck.png"));
            break;
        case Tarball :
            QTreeWidgetItem::setIcon(2,QIcon(":/new/icons/icons/tgz.png"));
            QTreeWidgetItem::setToolTip(2,QObject::tr("TGZ title: ")+_tgz_title);
            break;
        }
    }
    if(_index_count==0)
        QTreeWidgetItem::setIcon(3,QIcon(":/new/icons/icons/uncheck.png"));
    else
        QTreeWidgetItem::setIcon(3,QIcon(":/new/icons/icons/greencheck.png"));
}

QString MArchiveLibItem::iddataAsStr() const
{
    return QString::number(_data);
}

QString MArchiveLibItem::idAsStr() const
{
    return QString::number(_id);
}

QString MArchiveLibItem::idauthAsStr() const
{
    return QString::number(_author);
}

QString MArchiveLibItem::idcatAsStr() const
{
    return QString::number(_category);
}

// MTgzItem

MTgzItem::MTgzItem(QString const & title,QString const & path,unsigned int bytes,unsigned int id) :
    QTreeWidgetItem(QTreeWidgetItem::UserType),
    _id(id),
    _used(0),
    _bytes(bytes),
    _title(title),
    _path(path)
{

}

void MTgzItem::setText()
{
    QTreeWidgetItem::setText(0,_title+" ("+QString::number(_used)+")");
    QTreeWidgetItem::setText(1,QString::number(_bytes)+" B");
    QTreeWidgetItem::setText(2,_path);
    QTreeWidgetItem::setToolTip(2,_path);
}
