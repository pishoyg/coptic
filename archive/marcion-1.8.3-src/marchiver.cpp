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

#include "marchiver.h"
#include "ui_marchiver.h"

MArchiver::MArchiver(QWidget *parent) :
    QWidget(parent),
    ui(new Ui::MArchiver),
    _from(0),
    _size(0),
    _name(),_path(),
    _q(0),
    _is_valid(false),
    _is_ext(true),
    _allow_select(false),
    _list_prepared(false),
    _id(0),
    _it_count(0)
{
    ui->setupUi(this);

    ui->wdgPanel2->setVisible(false);
    ui->treeItems->header()->setResizeMode(QHeaderView::ResizeToContents);
    ui->treeItems->setSelectionMode(QAbstractItemView::SingleSelection);
}

MArchiver::MArchiver(unsigned int id,QString const & name,bool extended,QWidget *parent) :
    QWidget(parent),
    ui(new Ui::MArchiver),
    _from(0),
    _size(0),
    _name(name),
    _q(0),
    _is_valid(false),
    _is_ext(extended),
    _allow_select(false),
    _id(id),
    _it_count(0)
{
    ui->setupUi(this);
    setWindowTitle(windowTitle()+" | "+_name);

    ui->wdgPanel1->setVisible(_allow_select);
    ui->wdgPanel2->setVisible(true);

    ui->treeItems->header()->setResizeMode(QHeaderView::ResizeToContents);

    ui->treeItems->setSelectionMode(QAbstractItemView::MultiSelection);
    executeQuery();

    IC_SIZES
}

MArchiver::~MArchiver()
{
    if(_q)
        delete _q;

    delete ui;
}

void MArchiver::init(unsigned int id,bool allow_select)
{
    _id=id;
    _allow_select=allow_select;

    if(_allow_select)
        fillList();
    else
        ui->wdgPanel1->hide();
}

void MArchiver::renewQuery()
{
    if(_q)
        delete _q;
    emit beforeQuery();
    _q=new CMySql();
}

void MArchiver::on_btClose_clicked()
{
    if(!_is_ext)
        close();
}

void MArchiver::on_btAll_clicked()
{
    if(!_is_ext)
    {
        bool overwrite(ui->cbOverwrite->isChecked());
        QString ot(overwrite?tr("(existing files WILL NOT BE overwritten)"):tr("(existing files WILL BE overwritten)"));
        QMessageBox mb(QMessageBox::Question,tr("extract files"),tr("All files will be extracted. Continue?\n")+ot,QMessageBox::Ok|QMessageBox::Cancel,this);
        if(mb.exec()==QMessageBox::Ok)
            extractTgz(false,overwrite);
    }
}

void MArchiver::on_btSel_clicked()
{
    if(!_is_ext)
    {
        int si(ui->treeItems->selectedItems().count());
        bool overwrite(ui->cbOverwrite->isChecked());
        QString ot(overwrite?tr("(existing files WILL NOT BE overwritten)"):tr("(existing files WILL BE overwritten)"));
        if(si>0)
        {
            QMessageBox mb(QMessageBox::Question,tr("extract files"),QString::number(si)+tr(" files will be extracted. Continue?\n")+ot,QMessageBox::Ok|QMessageBox::Cancel,this);
            if(mb.exec()==QMessageBox::Ok)
                extractTgz(true,overwrite);
        }
        else
            m_msg()->MsgErr(tr("no items selected!"));
    }
}

void MArchiver::listTgz()
{
    USE_CLEAN_WAIT
    //ui->treeItems->clear();
    //_items.clear();

    struct archive *a;
    struct archive_entry *entry;
    int e;

    m_msg()->MsgMsg(tr("listing archive '")+_name+"' ...");

    a = archive_read_new();
    if(!a)
    {
        m_msg()->MsgErr(tr("cannot initialize archive!"));
        return;
    }

    e=archive_read_support_compression_gzip(a);
    if (e != ARCHIVE_OK)
    {
        m_msg()->MsgErr(tr("cannot set compression for archive '")+_name+"' (errno "+QString::number(archive_errno(a))+")\n\n"+QString(archive_error_string(a)));
        archive_read_finish(a);
        return;
    }
    e=archive_read_support_format_tar(a);
    if (e != ARCHIVE_OK)
    {
        m_msg()->MsgErr(tr("cannot set format for archive '")+_name+"' (errno "+QString::number(archive_errno(a))+")\n\n"+QString(archive_error_string(a)));
        archive_read_finish(a);
        return;
    }
    e = archive_read_open_memory(a, _from, _size);
    if (e != ARCHIVE_OK)
    {
        m_msg()->MsgErr(tr("cannot open archive '")+_name+"' (errno "+QString::number(archive_errno(a))+")\n\n"+QString(archive_error_string(a)));
        archive_read_finish(a);
        return;
    }
    int ew(0);
    while ((e=archive_read_next_header(a, &entry))!=ARCHIVE_EOF)
    {
        switch(e)
        {
        case ARCHIVE_FATAL :
        case ARCHIVE_RETRY :
            m_msg()->MsgMsg(tr("error occured during retrieving content of archive '")+_name+"' (errno "+QString::number(archive_errno(a))+")\n\n"+QString(archive_error_string(a)));
            ew++;
            break;
        case ARCHIVE_WARN :
            m_msg()->MsgMsg(tr("warning occured during retrieving content of archive '")+_name+"' (errno "+QString::number(archive_errno(a))+")\n\n"+QString(archive_error_string(a)));
            ew++;
        case ARCHIVE_OK :
            {
                MCrArItem * i(new MCrArItem());
                i->_name=i->_path=QString(archive_entry_pathname(entry));
                i->_size=archive_entry_size(entry);
                i->_perm=archive_entry_mode(entry);
                i->_strmode=QString(archive_entry_strmode(entry));
                i->setText();
                ui->treeItems->addTopLevelItem(i);
                _items.append(i);
                _it_count++;
                break;
            }
        }

        archive_read_data_skip(a);
    }
    archive_read_close(a);
    archive_read_finish(a);

    if(ew>0)
        m_msg()->MsgInf(QString::number(ew)+tr(" errors/warnings occurred during listing archive '")+_name+"'");
    m_msg()->MsgMsg(QString::number(_it_count)+tr(" items found in archive '")+_name+"'");
    m_msg()->MsgOk();
    emit tgzExamined();
}

void MArchiver::extractTgz(bool selected_only,bool overwrite) const
{
    struct archive *a;
    struct archive_entry *entry;
    int e;

    USE_CLEAN_WAIT

    QFileInfo fi_path(_path);
    QString addpath(fi_path.path());

    m_msg()->MsgMsg(tr("extracting archive '")+_name+"', directory '"+fi_path.fileName()+tr("' into '")+addpath+"'");

    CProgressDialog pd;
    pd.initProgress(tr("extracting tarball ..."),_it_count);
    pd.show();

    a = archive_read_new();
    if(!a)
    {
        m_msg()->MsgErr(tr("cannot initialize archive '")+_name+"'");
        return;
    }
    e=archive_read_support_format_tar(a);
    if(e!=ARCHIVE_OK)
    {
        m_msg()->MsgErr(tr("cannot set archive format (errno ")+QString::number(archive_errno(a))+")\n\n"+QString(archive_error_string(a)));
        archive_read_finish(a);
        return;
    }

    e=archive_read_support_compression_gzip(a);
    if(e!=ARCHIVE_OK)
    {
        m_msg()->MsgErr(tr("cannot set archive compression (errno ")+QString::number(archive_errno(a))+")\n\n"+QString(archive_error_string(a)));
        archive_read_finish(a);
        return;
    }

    e=archive_read_open_memory(a,_from,_size);
    if(e!=ARCHIVE_OK)
    {
        m_msg()->MsgErr(tr("cannot open archive (errno ")+QString::number(archive_errno(a))+")\n\n"+QString(archive_error_string(a)));
        archive_read_finish(a);
        return;
    }

    QStringList warns,errs;
    bool skip;
    unsigned int rei(0);
    for(unsigned int it=1;true;it++)
    {
        if(pd.stopped())
        {
            pd.close();
            archive_read_close(a);
            archive_read_finish(a);
            m_msg()->MsgInf(tr("progress interrupted"));
            return;
        }
        pd.incProgress();

        e = archive_read_next_header(a, &entry);
        if (e==ARCHIVE_EOF)
          break;

        if(it>_it_count)
        {
            skip=true;
            QString err(tr("unexpected error (item ")+QString::number(it)+tr("), skipping remaining items ..."));
            errs.append(err);
            m_msg()->MsgMsg(err);
        }
        else
            skip=(selected_only&&!_items.at(it-1)->isSelected());

        switch(e)
        {
        case ARCHIVE_RETRY :
        case ARCHIVE_FATAL :
        {
            QString err(tr("error occurred during retrieving content of archive '")+_name+tr("item ")+QString::number(it)+") (errno "+QString::number(archive_errno(a))+")\n\n"+QString(archive_error_string(a)));
            errs.append(err);
            m_msg()->MsgMsg(err);
            continue;
            break;
        }
        case ARCHIVE_WARN :
        {
            QString warn(tr("warning occurred during retrieving content of archive '")+_name+tr("item ")+QString::number(it)+") (errno "+QString::number(archive_errno(a))+")\n\n"+QString(archive_error_string(a)));
            warns.append(warn);
            m_msg()->MsgMsg(warn);
            break;
        }
        case ARCHIVE_OK :
            break;
        }

        archive_entry_set_pathname(entry,QString(addpath+QDir::separator()+QString(archive_entry_pathname(entry))).toUtf8().data());
        QString pname(archive_entry_pathname(entry));
        if(skip)
        {
            m_msg()->MsgMsg(tr("item ")+QString::number(it)+" '"+QString(pname+tr("', skipped ...")));
            continue;
        }
        else
        {
            if(!overwrite)
            {
                if(QFile::exists(pname))
                {
                    m_msg()->MsgMsg(tr("item ")+QString::number(it)+" '"+pname+tr("' exists already, skipped ..."));
                    continue;
                }
            }
            else
                m_msg()->MsgMsg(tr("extracting item ")+QString::number(it)+" '"+pname+"' ...");
        }

        e=archive_read_extract(a,entry,0);
        switch(e)
        {
        case ARCHIVE_RETRY :
        case ARCHIVE_FATAL :
        {
            QString err(tr("error occurred during retrieving content of archive '")+_name+tr("item ")+QString::number(it)+") (errno "+QString::number(archive_errno(a))+")\n\n"+QString(archive_error_string(a)));
            errs.append(err);
            m_msg()->MsgMsg(err);
            continue;
            break;
        }
        case ARCHIVE_WARN :
        {
            QString warn(tr("warning occurred during retrieving content of archive '")+_name+tr("item ")+QString::number(it)+") (errno "+QString::number(archive_errno(a))+")\n\n"+QString(archive_error_string(a)));
            warns.append(warn);
            m_msg()->MsgMsg(warn);
            //break;
        }
        case ARCHIVE_OK :
            rei++;
            break;
        }
    }
    archive_read_close(a);
    archive_read_finish(a);

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

    m_msg()->MsgInf(tr("archive extracted.\n\nextracted items: ")+QString::number(rei)+tr("\n\nerrors: ")+QString::number(errs.count())+tr("\nwarnings: ")+QString::number(warns.count()));

    m_msg()->MsgOk();
}

void MArchiver::executeQuery()
{
    USE_CLEAN_WAIT

    ui->treeItems->clear();
    _items.clear();

    renewQuery();
    QString query("select `data`,`bytes`,`tgz_title`,`tgz_path` from `library_data` where `id`="+QString::number(_id));

    m_msg()->MsgMsg(tr("executing query '")+query+"' ...");
    if(_q->exec(query))
    {
        if(_q->first())
        {
            _from=_q->data(0);
            _size=_q->value(1).toUInt();
            _name=_q->value(2);
            _path=_q->value(3);
            ui->lblPath->setText(_path);

            if(_from==0||_size==0)
            {
                m_msg()->MsgErr(tr("archive is empty!"));
                _is_valid=false;
                return;
            }
            _is_valid=true;
            m_msg()->MsgOk();
            listTgz();
            setWindowTitle(tr("TGZ manager | ")+_name);
        }
        else
        {
            _is_valid=false;
            m_msg()->MsgErr(tr("archive not found!"));
        }
    }
    else
    {
        _is_valid=false;
        m_msg()->MsgErr(_q->lastError());
    }
}

void MArchiver::fillList()
{
    if(!_list_prepared)
    {
        USE_CLEAN_WAIT
        QString query("select `id`,`tgz_title` from `library_data` where type=2 order by `tgz_title`");
        MQUERY(q,query)

        while(q.next())
            ui->cmbTgz->addItem(q.value(1),q.value(0).toUInt());

        _list_prepared=true;
        m_msg()->MsgOk();
    }
}

void MArchiver::on_cmbTgz_currentIndexChanged(int index)
{
    if(_allow_select&&index>0)
    {
        _id=ui->cmbTgz->itemData(index).toUInt();
        executeQuery();
    }
}

QString MArchiver::selectedFile() const
{
    MCrArItem * i((MCrArItem *)ui->treeItems->currentItem());
    if(i)
        return i->_path;
    return QString();
}

bool MArchiver::checkFilePath(QString const & filepath)
{
    QString rpath(QFileInfo(_path).path()+QDir::separator());
    m_msg()->MsgMsg(tr("looking for file '")+filepath+tr("' in tarball '")+_name+"', path '"+rpath+"'");
    for(int x=0;x<_items.count();x++)
    {
        MCrArItem * i(_items.at(x));
        if(QString::compare(QDir::toNativeSeparators(rpath+i->_path),QDir::toNativeSeparators(filepath),Qt::CaseSensitive)==0)
        {
            ui->treeItems->clearSelection();
            ui->treeItems->setCurrentItem(i);
            i->setSelected(true);
            return true;
        }
    }

    ui->treeItems->setCurrentItem(0);
    ui->treeItems->clearSelection();
    return false;
}
