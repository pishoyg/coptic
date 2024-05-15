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

#include "marchivewidget.h"
#include "ui_marchivewidget.h"

MArchiveWidget::MArchiveWidget(CLibraryWidget * lib_widget,QTabWidget ** const main_tab,QWidget *parent) :
    QWidget(parent),
    ui(new Ui::MArchiveWidget),
    _libraryW(lib_widget),
    _mainTab(main_tab),
    _lbranch(0),
    lbAll(0),lbUnc(0),
    popupCat(),
    popupStruct(),
    _agrp(0)
{
    ui->setupUi(this);

    a_str_open=popupStruct.addAction(tr("&open"));
    a_str_open->setShortcut(QKeySequence("Ctrl+O"));
    popupStruct.addSeparator();
    a_str_add=popupStruct.addAction(QIcon(":/new/icons/icons/add_item.png"),tr("&add text(s)"));
    a_str_del=popupStruct.addAction(QIcon(":/new/icons/icons/stop.png"),tr("&remove text(s)"));
    a_str_edit=popupStruct.addAction(tr("&edit item"));
    a_str_chngauth=popupStruct.addAction(tr("chan&ge author"));
    a_chngcat=popupStruct.addAction(tr("&move to category"));
    popupStruct.addSeparator();
    a_str_refcat=popupStruct.addAction(QIcon(":/new/icons/icons/refresh.png"),tr("re&fresh categories"));
    a_str_mancat=popupStruct.addAction(QIcon(":/new/icons/icons/settings.png"),tr("ma&nage categories"));
    popupStruct.addSeparator();
    a_str_store=popupStruct.addAction(tr("s&tore/attach item data"));
    a_str_restore=popupStruct.addAction(tr("restore &item data"));
    a_str_dropdata=popupStruct.addAction(tr("&drop/detach item data"));
    a_str_crindex=popupStruct.addAction(tr("(re)&create item index"));
    a_str_dropindex=popupStruct.addAction(tr("dro&p item index"));
    popupStruct.addSeparator();
    a_hdr_free=popupStruct.addAction(tr("&resizable columns"));
    a_hdr_lock=popupStruct.addAction(tr("&locked columns"));
    a_hdr_free->setCheckable(true);
    a_hdr_lock->setCheckable(true);
    a_hdr_lock->setChecked(true);
    a_hdr_free->setChecked(false);
    _agrp.setExclusive(true);
    _agrp.addAction(a_hdr_free);
    _agrp.addAction(a_hdr_lock);

    a_cat_refresh=popupCat.addAction(tr("refresh current"));
    a_cat_add=popupCat.addAction(QIcon(":/new/icons/icons/add_item.png"),tr("&add text(s)"));
    popupCat.addSeparator();
    a_cat_refcat=popupCat.addAction(QIcon(":/new/icons/icons/refresh.png"),tr("refresh categories"));
    a_cat_manage=popupCat.addAction(QIcon(":/new/icons/icons/settings.png"),tr("manage"));

    ui->cmbFilterArch->completer()->setCaseSensitivity(Qt::CaseInsensitive);
    ui->cmbFilterArch->completer()->setCompletionMode(QCompleter::PopupCompletion);

    ui->treeStruct->hideColumn(1);
    ui->treeArchive->header()->setResizeMode(QHeaderView::ResizeToContents);

    ui->splitter->setStretchFactor(0,1);
    ui->splitter->setStretchFactor(1,3);

    IC_SIZES
}

MArchiveWidget::~MArchiveWidget()
{
    if(_lbranch)
        delete _lbranch;
    delete ui;
}

//

void MArchiveWidget::manageArchive()
{
    if(!_lbranch)
    {
        _lbranch=new MLibraryBranches();
        connect(_lbranch,SIGNAL(categoriesChanged()),this,SLOT(slot_categoriesChanged()));
        connect(this,SIGNAL(tgzsChanged()),_lbranch,SLOT(slot_reloadTgzs()));
        connect(this,SIGNAL(authsChanged()),_lbranch,SLOT(slot_reloadAuths()));
        connect(this,SIGNAL(catsChanged()),_lbranch,SLOT(slot_reloadCats()));
        connect(_lbranch,SIGNAL(closeManager()),this,SLOT(slot_closeManager()));
        (*_mainTab)->addTab(_lbranch,QIcon(":/new/icons/icons/settings.png"),tr("ar&chive manager"));
    }
    (*_mainTab)->setCurrentWidget(_lbranch);
}

void MArchiveWidget::slot_closeManager()
{
    delete _lbranch;
    _lbranch=0;
    (*_mainTab)->setCurrentIndex(MTIDX_ARCH);
}

void MArchiveWidget::slot_categoriesChanged()
{
    readCategories();
}

void MArchiveWidget::readCategories(bool after_drop,int select_id)
{
    m_msg()->MsgMsg(tr("reading archive categories ..."));
    ui->treeArchive->clear();

    MLibraryBranches::readBranches(ui->treeStruct,false,select_id);
    lbAll=new MLibBranchItem(0,MLibBranchItem::Unchanged,true);
    lbUnc=new MLibBranchItem(0,MLibBranchItem::Unchanged,true);

    QString query("select count(*) from `library_archive` left outer join `library_branch` on `library_archive`.`category`=`library_branch`.`id` where `library_branch`.`id` is null");
    MQUERY_GETFIRST(q,query)
    lbUnc->_name=QString("uncategorized");
    lbUnc->_arch_items=q.value(0).toUInt();
    lbUnc->_type=MLibBranchItem::Uncategorized;
    lbUnc->setText();
    ui->treeStruct->insertTopLevelItem(0,lbUnc);

    QString query2("select count(*) from `library_archive`");
    MQUERY_GETFIRST(q2,query2)
    lbAll->_name=QString("all");
    lbAll->_arch_items=q2.value(0).toUInt();
    lbAll->_type=MLibBranchItem::All;
    lbAll->setText();
    ui->treeStruct->insertTopLevelItem(0,lbAll);

    m_msg()->MsgOk();

    if(after_drop)
    {
        emit catsChanged();
        emit authsChanged();
        emit tgzsChanged();
    }
    emit indexChanged(CLibSearchBase::Archive);
}

void MArchiveWidget::on_treeArchive_customContextMenuRequested(QPoint )
{
    MLibBranchItem * ci((MLibBranchItem *)ui->treeStruct->currentItem());
    MArchiveLibItem * ci2((MArchiveLibItem*)ui->treeArchive->currentItem());
    int const ic(ui->treeArchive->selectedItems().count());

    a_str_open->setEnabled(ic>0);
    //a_str_add->setEnabled(ci);
    a_str_del->setEnabled(ci2);
    a_str_edit->setEnabled(ci2);
    a_str_dropdata->setEnabled(false);
    a_str_dropindex->setEnabled(ci2);
    a_str_store->setEnabled(false);
    a_str_crindex->setEnabled(ci2);
    a_str_restore->setEnabled(false);

    if(ci2)
    {
        a_str_dropdata->setEnabled(!ci2->_data_type==MArchiveLibItem::NoData);
        a_str_store->setEnabled(ci2->_data_type==MArchiveLibItem::NoData);
        a_str_restore->setEnabled(!ci2->_data_is_null);
    }

    popupStruct.setActiveAction(a_str_open);
    QAction *a=popupStruct.exec();
    if(a)
    {
        if(a==a_str_add)
            addArchiveItem(ci);
        else if(a==a_str_del)
            removeArchiveItem(ci);
        else if(a==a_str_edit)
            editArchiveItem(ci2);
        else if(a==a_str_open)
            openArchiveBooks();
        else if(a==a_str_refcat)
            readCategories();
        else if(a==a_str_mancat)
            manageArchive();
        else if(a==a_chngcat)
            changeArchiveCategory();
        else if(a==a_str_store)
            storeArchData(ci2);
        else if(a==a_str_restore)
            restoreArchData(ci2);
        else if(a==a_str_crindex)
            createMIndex(ci2);
        else if(a==a_str_dropdata)
            dropArchData();
        else if(a==a_str_dropindex)
            dropMIndex(0);
        else if(a==a_str_chngauth)
            chngArchAuthor();
        else if(a==a_hdr_lock)
            ui->treeArchive->header()->setResizeMode(QHeaderView::ResizeToContents);
        else if(a==a_hdr_free)
            ui->treeArchive->header()->setResizeMode(QHeaderView::Interactive);
    }
}

void MArchiveWidget::chngArchAuthor()
{
    QList<QTreeWidgetItem*> li(ui->treeArchive->selectedItems());
    if(li.count()>0)
    {
        MArchiveItem mi;
        if(mi.exec()==QDialog::Accepted)
        {
            QString query("update `library_archive` set `author`="+mi.newAuthor()+" where `id` in("),
                    works;
            for(int x=0;x<li.count();x++)
            {
                MArchiveLibItem * item((MArchiveLibItem *)li.at(x));
                query.append(QString::number(item->_id)+",");
                works.append(item->_workT+"\n");
            }
            query.chop(1);
            query.append(")");

            QMessageBox mb(QMessageBox::Question,tr("change author"),tr("Author of works\n\n")+works+tr("\nwill be changed to '")+mi.newAuthorName()+tr("'. Continue?"),QMessageBox::Ok|QMessageBox::Cancel,this);
            if(mb.exec()==QMessageBox::Ok)
            {
                USE_CLEAN_WAIT

                MQUERY(q,query)
                m_msg()->MsgOk();
                on_treeStruct_itemSelectionChanged();

                emit authsChanged();
                emit indexChanged(CLibSearchBase::Archive);
            }
        }
    }
    else
        m_msg()->MsgErr(tr("no item(s) selected!"));
}

void MArchiveWidget::changeArchiveCategory()
{
    QList<QTreeWidgetItem*> li(ui->treeArchive->selectedItems());
    if(li.count()>0)
    {
        MChooseCategory d;
        MLibraryBranches::readBranches(d.tree());
        if(d.exec()==QDialog::Accepted)
        {
            MLibBranchItem * i(d.category());
            if(i)
            {
                QString w,msg;
                for(int x=0;x<li.count();x++)
                {
                    MArchiveLibItem * a_i((MArchiveLibItem *)li.at(x));
                    w.append(QString::number(a_i->_id)+",");
                    msg.append(a_i->_workT+"\n");
                }
                w.chop(1);
                msg.append("\n");

                QMessageBox mb(QMessageBox::Question,tr("change category"),tr("Category of items\n\n")+msg+tr("will be changed to '")+i->_name+tr("' Continue?"),QMessageBox::Yes|QMessageBox::No,this);

                if(mb.exec()==QMessageBox::Yes)
                {
                    QString query("update `library_archive` set `category`="+QString::number(i->_id)+" where `id` in("+w+")");
                    MQUERY(q,query)
                    m_msg()->MsgOk();
                    emit catsChanged();
                }
            }
            else
                m_msg()->MsgWarn(tr("no category selected!"));
        }
    }
    else
        m_msg()->MsgWarn(tr("no selected items"));
}

void MArchiveWidget::setArchiveFilter(QString const & filter)
{
    ui->cmbFilterArch->setEditText(filter);
    ui->btFilter->setChecked(true);
    CLatCopt::updateHistory(ui->cmbFilterArch,false);

    readCategories();
    if(lbAll)
    {
        lbAll->setSelected(true);
        ui->treeStruct->setCurrentItem(lbAll);
    }
}

void MArchiveWidget::addArchiveItem(MLibBranchItem * item)
{
    QList<QTreeWidgetItem*> items=_libraryW->htmlTree()->selectedItems();
    if(items.count()==0)
    {
        int itype(-1);
        if(item)
            itype=item->_type;
        else
            itype=MLibBranchItem::Uncategorized;

        QString query/*,query2("select last_insert_id()")*/;
        switch(itype)
        {
        case MLibBranchItem::Standard :
            query=QString("insert into `library_archive` (`work`,`author`,`filename`,`category`) values ('new work',null,'(filename)',"+QString::number(item->_id)+")");
            break;
        case MLibBranchItem::All :
            query=QString("insert into `library_archive` (`work`,`author`,`filename`,`category`) values ('new work',null,'(filename)',null)");
            break;
        default :
            query=QString("insert into `library_archive` (`work`,`author`,`filename`,`category`) values ('new work',null,'(filename)',null)");
            break;
        }

        MQUERY(q,query)
        /*MQUERY_GETFIRST(q2,query2)*/
        m_msg()->MsgOk();

        setArchiveFilter("id:"+q.lastInsertIdAsString());
    }
    else
    {
        MLibBranchItem::Type itype;
        QString catname;
        if(item)
        {
            itype=item->_type;
            catname=item->_name;
        }
        else
        {
            itype=MLibBranchItem::Uncategorized;
            catname=QString("-");
        }

        QMessageBox mb(QMessageBox::Question,tr("add texts"),QString::number(items.count())+tr(" texts will be added to category '")+catname+tr("'. Continue?"),QMessageBox::Ok|QMessageBox::Cancel,this);
        if(mb.exec()==QMessageBox::Cancel)
            return;

        //QString const query2("select last_insert_id()");
        QString ids;
        for(int x=0;x<items.count();x++)
        {
            QTreeWidgetItem * fi(items.at(x));
            QString
                    fn(MFileChooser::relativeToLibrary(fi->text(3),true)),
                    fname(QFileInfo(fn).baseName()),
                    query;

            switch(itype)
            {
            case MLibBranchItem::Standard :
                query=QString("insert into `library_archive` (`work`,`author`,`filename`,`category`) values ('"+fname+"',null,'"+CTranslit::escaped(fn)+"',"+QString::number(item->_id)+")");
                break;
            case MLibBranchItem::All :
                query=QString("insert into `library_archive` (`work`,`author`,`filename`,`category`) values ('"+fname+"',null,'"+CTranslit::escaped(fn)+"',null)");
                break;
            default :
                query=QString("insert into `library_archive` (`work`,`author`,`filename`,`category`) values ('"+fname+"',null,'"+CTranslit::escaped(fn)+"',null)");
                break;
            }

            MQUERY(q,query)
            /*MQUERY_GETFIRST(q2,query2)*/
            ids.append(q.lastInsertIdAsString()+",");
        }
        m_msg()->MsgOk();
        ids.chop(1);
        setArchiveFilter("id:"+ids);
    }

    emit catsChanged();
    emit authsChanged();
    //emit indexChanged(CLibSearchBase::Archive);
}

void MArchiveWidget::removeArchiveItem(MLibBranchItem * item)
{
    QList<QTreeWidgetItem*> li(ui->treeArchive->selectedItems());
    if(li.count()>0)
    {
        QString w,names;
        bool tball(false);
        for(int x=0;x<li.count();x++)
        {
            MArchiveLibItem * item((MArchiveLibItem *)li.at(x));
            w.append(item->idAsStr()+",");
            names.append(item->_workT+"\n");
            if(item->_data_type==MArchiveLibItem::Tarball)
                tball=true;
        }
        w.chop(1);
        names.append("\n");

        QMessageBox mb(QMessageBox::Question,tr("delete archive items"),tr("Items:\n\n")+names+tr("will be deleted, with their stored data (single files only, not tarballs) and indexes. Continue? (associated file will not be deleted)"),QMessageBox::Yes|QMessageBox::No,this);
        if(mb.exec()==QMessageBox::Yes)
        {
            QString query("delete from `library_archive` where `id` in("+w+")");
            MQUERY(q,query)
            m_msg()->MsgOk();

            unsigned int i_id;
            int i_type(-1);
            if(item)
            {
                i_id=item->_id;
                i_type=item->_type;
            }
            if(i_type==MLibBranchItem::Standard)
                readCategories(false,(int)i_id);
            else
                readCategories();
            if(i_type!=-1)
            {
                switch(i_type)
                {
                case MLibBranchItem::All :
                    if(lbAll)
                    {
                        lbAll->setSelected(true);
                        ui->treeStruct->setCurrentItem(lbAll);
                    }
                    break;
                case MLibBranchItem::Uncategorized :
                    if(lbUnc)
                    {
                        lbUnc->setSelected(true);
                        ui->treeStruct->setCurrentItem(lbUnc);
                    }
                    break;
                default :
                    break;
                }
            }

            if(tball)
                emit tgzsChanged();
            emit catsChanged();
            emit authsChanged();
        }
    }
}

void MArchiveWidget::editArchiveItem(QTreeWidgetItem * i)
{
    MArchiveLibItem * item((MArchiveLibItem *)i);
    if(item)
    {
        QTreeWidgetItem * fi(_libraryW->htmlTree()->currentItem());
        QString alt_target;
        if(fi)
        {
            alt_target=fi->text(3);
            alt_target=MFileChooser::relativeToLibrary(alt_target,true);
        }
        bool allow_chng_file(item->_data_type==MArchiveLibItem::NoData&&item->_index_count==0);
        MArchiveItem d(item->_workT,item->idauthAsStr(),item->_target,alt_target,allow_chng_file,this);
        if(d.exec()==QDialog::Accepted)
        {
            /*if(!allow_chng_file)
            {
                m_msg()->MsgErr(tr("Underlying file of item with stored/asocciated data or/and index cannot be changed! Remove them first."));
                return;
            }*/

            QString fp;
            if(allow_chng_file)
                fp=QString(QString(",`filename`='")+CTranslit::escaped(d.newTarget())+"'");
            QString query("update `library_archive` set `work`='"+d.newWork()+"',`author`="+d.newAuthor()+fp+" where `id`="+item->idAsStr());
            MQUERY(q,query)
            m_msg()->MsgOk();

            if(allow_chng_file)
                item->_target=d.newTarget();
            item->_workT=d.newWork();
            if(d.isAuthorChanged())
            {
                item->_author=d.newAuthor().toUInt();
                item->_authorT=d.newAuthorName();
            }
            item->setText();

            if(d.isAuthorChanged())
                emit authsChanged();
            emit indexChanged(CLibSearchBase::Archive);
        }
    }
}

MArchiveWidget::ArchiveFilterType MArchiveWidget::parseArchiveFilter(QString & filter)
{
    QString f(filter);
    QRegExp r("^(work|auth|filename|tgzname|id):");
    r.setMinimal(true);

    int p=r.indexIn(f);
    if(p==-1)
        return Work;
    else
    {
        QString ft(r.cap(0));
        f.remove(QRegExp("^"+ft));
        filter=f;
        ft.chop(1);
        if(QString::compare(ft,"work",Qt::CaseInsensitive)==0)
            return Work;
        if(QString::compare(ft,"auth",Qt::CaseInsensitive)==0)
            return Author;
        if(QString::compare(ft,"file",Qt::CaseInsensitive)==0)
            return FileName;
        if(QString::compare(ft,"tgz",Qt::CaseInsensitive)==0)
            return TgzName;
        if(QString::compare(ft,"id",Qt::CaseInsensitive)==0)
            return Id;
    }

    return Work;
}

void MArchiveWidget::loadArchiveLibrary(MLibBranchItem * category_item, QTreeWidget * tree,bool filtered,QString const & filter, bool lwtree,int selected_id)
{
    USE_CLEAN_WAIT

    tree->clear();

    /*MLibBranchItem c_def(0,MLibBranchItem::Unchanged,true);
    c_def._type=MLibBranchItem::All;

    if(!category_item)
        category_item=&c_def;*/

    if(category_item)
    {
        QString query,wh1,wh2;
        if(filtered)
        {
            if(!filter.isEmpty())
            {
                QString flt(filter);
                MArchiveWidget::ArchiveFilterType ftype(MArchiveWidget::parseArchiveFilter(flt));
                switch(ftype)
                {
                case MArchiveWidget::Work :
                    wh1=QString(" and `library_archive`.`work` regexp '"+flt+"'");
                    wh2=QString(" where `library_archive`.`work` regexp '"+flt+"'");
                    break;
                case MArchiveWidget::Author :
                    wh1=QString(" and `library_author`.`author` regexp '"+flt+"'");
                    wh2=QString(" where `library_author`.`author` regexp '"+flt+"'");
                    break;
                case MArchiveWidget::FileName :
                    wh1=QString(" and `library_archive`.`filename` regexp '"+flt+"'");
                    wh2=QString(" where `library_archive`.`filename` regexp '"+flt+"'");
                    break;
                case MArchiveWidget::TgzName :
                    wh1=QString(" and `library_data`.`tgz_title` regexp '"+flt+"'");
                    wh2=QString(" where `library_data`.`tgz_title` regexp '"+flt+"'");
                    break;
                case MArchiveWidget::Id :
                    wh1=QString(" and `library_archive`.`id` in("+flt+")");
                    wh2=QString(" where `library_archive`.`id` in("+flt+")");
                    break;
                }
            }
        }
        switch(category_item->_type)
        {
        case MLibBranchItem::Standard :
            query=QString("select `library_archive`.`id`,`library_archive`.`work`,`library_author`.`author`,`library_archive`.`filename`,`library_author`.`id`,`library_archive`.`data_id`,`library_data`.`bytes`,`library_archive`.`i_count`,`i_count_diff`,`library_archive`.`i_lat_count`,`library_archive`.`i_gk_count`,`library_archive`.`i_cop_count`,`library_archive`.`i_heb_count`,`library_data`.`type`,`library_data`.`tgz_title` from `library_archive` left outer join `library_author` on `library_archive`.`author`=`library_author`.`id` left outer join `library_data` on `library_archive`.`data_id`=`library_data`.`id` where `library_archive`.`category`="+QString::number(category_item->_id)+wh1);
            break;
        case MLibBranchItem::All :
            query=QString("select `library_archive`.`id`,`library_archive`.`work`,`library_author`.`author`,`library_archive`.`filename`,`library_author`.`id`,`library_archive`.`category`,`library_branch`.`id`,`library_archive`.`data_id`,`library_data`.`bytes`,`library_archive`.`i_count`,`i_count_diff`,`library_archive`.`i_lat_count`,`library_archive`.`i_gk_count`,`library_archive`.`i_cop_count`,`library_archive`.`i_heb_count`,`library_data`.`type`,`library_data`.`tgz_title` from `library_archive` left outer join `library_author` on `library_archive`.`author`=`library_author`.`id` left outer join `library_branch` on `library_archive`.`category`=`library_branch`.`id` left outer join `library_data` on `library_archive`.`data_id`=`library_data`.`id`"+wh2);
            break;
        default :
            query=QString("select `library_archive`.`id`,`library_archive`.`work`,`library_author`.`author`,`library_archive`.`filename`,`library_author`.`id`,`library_archive`.`category`,`library_archive`.`data_id`,`library_data`.`bytes`,`library_archive`.`i_count`,`i_count_diff`,`library_archive`.`i_lat_count`,`library_archive`.`i_gk_count`,`library_archive`.`i_cop_count`,`library_archive`.`i_heb_count`,`library_data`.`type`,`library_data`.`tgz_title` from `library_archive` left outer join `library_author` on `library_archive`.`author`=`library_author`.`id` left outer join `library_branch` on `library_archive`.`category`=`library_branch`.`id` left outer join `library_data` on `library_archive`.`data_id`=`library_data`.`id` where `library_branch`.`id` is null"+wh1);
            break;
        }

        MQUERY(q,query)

        MArchiveLibItem * sel_item(0);
        while(q.next())
        {
            MArchiveLibItem * ni(new MArchiveLibItem());

            ni->_workT=q.value(1);
            int data_field(5);
            switch(category_item->_type)
            {
            case MLibBranchItem::Standard :
                data_field=5;
                if(lwtree)
                    ni->setIcon(0,QIcon(":/new/icons/icons/bluecat.png"));
                break;
            case MLibBranchItem::All :
                data_field=7;
                if(q.isNULL(5))
                {
                    if(lwtree)
                        ni->setIcon(0,QIcon(":/new/icons/icons/greencat.png"));
                }
                else
                {
                    if(q.isNULL(6))
                    {
                        if(lwtree)
                            ni->setIcon(0,QIcon(":/new/icons/icons/redcat.png"));
                    }
                    else if(lwtree)
                        ni->setIcon(0,QIcon(":/new/icons/icons/bluecat.png"));
                }
                break;
            case MLibBranchItem::Uncategorized :
                data_field=6;
                if(q.isNULL(5))
                {
                    if(lwtree)
                        ni->setIcon(0,QIcon(":/new/icons/icons/greencat.png"));
                }
                else if(lwtree)
                    ni->setIcon(0,QIcon(":/new/icons/icons/redcat.png"));
                break;
            }

            if(q.isNULL(2))
            {
                ni->_authorT=QString("???");
                ni->_author_is_null=true;
            }
            else
            {
                ni->_authorT=q.value(2);
                ni->_author_is_null=false;
                ni->_author=q.value(4).toUInt();
            }

            if(q.isNULL(data_field))
            {
                ni->_data_is_null=true;
                ni->_data=0;
                ni->_data_size=0;
                ni->_data_type=MArchiveLibItem::NoData;
            }
            else
            {
                ni->_data_type=(MArchiveLibItem::DataType)q.value(data_field+8).toInt();
                if(q.isNULL(data_field+8))
                    ni->_data_type=MArchiveLibItem::NoData;
                else
                    ni->_data_type=(MArchiveLibItem::DataType)q.value(data_field+8).toInt();

                switch(ni->_data_type)
                {
                case MArchiveLibItem::OneFile :
                case MArchiveLibItem::Tarball :
                    ni->_data_is_null=false;
                    ni->_data=q.value(data_field).toUInt();
                    if(q.isNULL(data_field+1))
                        ni->_data_size=0;
                    else
                        ni->_data_size=q.value(data_field+1).toLong();
                    break;
                default:
                    ni->_data_is_null=true;
                    ni->_data=0;
                    ni->_data_size=0;
                    ni->_data_type=MArchiveLibItem::NoData;
                    break;
                }

                ni->_data_is_null=false;
                ni->_data=q.value(data_field).toUInt();
                if(q.isNULL(data_field+1))
                    ni->_data_size=0;
                else
                    ni->_data_size=q.value(data_field+1).toLong();
            }

            if(q.isNULL(data_field+2))
            {
                ni->_index_count=0;
                ni->_index_count_diff=0;
            }
            else
            {
                ni->_index_count=q.value(data_field+2).toLong();
                ni->_index_count_diff=q.value(data_field+3).toLong();
                ni->_ind_lat=q.value(data_field+4).toLong();
                ni->_ind_gk=q.value(data_field+5).toLong();
                ni->_ind_cop=q.value(data_field+6).toLong();
                ni->_ind_heb=q.value(data_field+7).toLong();
            }

            ni->_target=q.value(3);
            if(!q.isNULL(data_field+9))
                ni->_tgz_title=q.value(data_field+9);
            ni->_id=q.value(0).toUInt();


            if(selected_id>0&&ni->_id==(unsigned int)selected_id)
                sel_item=ni;

            ni->setText();

            if(!lwtree)
            {
                if(ni->_index_count>0)
                {
                    ni->setFlags(ni->flags()|Qt::ItemIsUserCheckable);
                    ni->setCheckState(0,Qt::Unchecked);
                }
                else
                {
                    QFont f(ni->font(0));
                    f.setStrikeOut(true);
                    ni->setFont(0,f);
                }
            }
            tree->addTopLevelItem(ni);
        }

        if(sel_item)
        {
            sel_item->setSelected(true);
            tree->setCurrentItem(sel_item);
        }

        m_msg()->MsgOk();
    }
}

void MArchiveWidget::on_treeStruct_itemSelectionChanged()
{
    QList<QTreeWidgetItem*> si=ui->treeStruct->selectedItems();
    if(si.count()>0)
        loadArchiveLibrary((MLibBranchItem*)si.first(),ui->treeArchive,ui->btFilter->isChecked(),ui->cmbFilterArch->currentText(),true);
}

void MArchiveWidget::on_treeStruct_itemDoubleClicked(QTreeWidgetItem *, int )
{
    on_treeStruct_itemSelectionChanged();
}

void MArchiveWidget::on_treeStruct_customContextMenuRequested(const QPoint &)
{
    QTreeWidgetItem * i=ui->treeStruct->currentItem();
    MLibBranchItem * ci((MLibBranchItem *)i);

    a_cat_refresh->setEnabled(i);

    QAction * a=popupCat.exec();
    if(a)
    {
        if(a==a_cat_refresh)
            on_treeStruct_itemSelectionChanged();
        else if(a==a_cat_add)
            addArchiveItem(ci);
        else if(a==a_cat_refcat)
            readCategories();
        else if(a==a_cat_manage)
            manageArchive();
    }
}

void MArchiveWidget::storeArchData(MArchiveLibItem * item)
{
    if(item&&item->_data_type==MArchiveLibItem::NoData)
    {
        MSetArchiveData d(item->_target);
        if(d.exec()==QDialog::Accepted)
        {
            if(d.isOneFileMode())
            {
                USE_CLEAN_WAIT
                CMySql qp;
                int e(0);
                size_t bytes(0);
                QString output;

                QMessageBox mb(QMessageBox::Question,tr("store data"),tr("File will be imported into database. Continue?"),QMessageBox::Ok|QMessageBox::Cancel,this);
                if(mb.exec()==QMessageBox::Ok)
                {
                    m_msg()->MsgInf(QObject::tr("importing file '")+item->_target+tr("' into database ..."));
                    QString compressed_name;
                    CMBzip cf(QFileInfo(item->_target).absoluteFilePath(),m_msg());
                    if(cf.compressToTmpdir(compressed_name))
                        e=qp.fileToBlob("insert into `library_data` (`bytes`,`data`,`type`) values (",",'","',1)",compressed_name,output,bytes);
                    else return;
                    if(QFile::remove(compressed_name))
                        m_msg()->MsgMsg(tr("removing temporary file ... Ok."));
                    else
                        m_msg()->MsgMsg(tr("removing temporary file ... Failed."));

                    if(e==0)
                    {
                        unsigned long long const lid(qp.lastInsertId());
                        QString /*query2("select last_insert_id()"),*/query("update `library_archive` set `data_id`="+QString::number(lid)+" where `id`="+QString::number(item->_id));
                        /*MQUERY_GETFIRST(q2,query2)*/
                        MQUERY(q,query)

                        item->_data_is_null=false;
                        item->_data_type=MArchiveLibItem::OneFile;
                        item->_data=(unsigned int)lid;
                        item->_data_size=bytes;
                        item->setText();

                        m_msg()->MsgInf(output);
                        m_msg()->MsgOk();
                    }
                    else
                        m_msg()->MsgErr(output);
                }
                else return;
            }
            else
            {
                QString query("update `library_archive` set `data_id`="+QString::number(d.tgzId())+" where `id`="+QString::number(item->_id));
                MQUERY(q,query)

                item->_data_is_null=false;
                item->_data_type=MArchiveLibItem::Tarball;
                item->_data=d.tgzId();
                item->_data_size=d.tgzSize();
                item->setText();

                emit tgzsChanged();
                m_msg()->MsgInf(tr("Item '")+item->_workT+tr("' was successfully associated with tarball '")+d.tgzName()+"'");
                m_msg()->MsgOk();
            }
        }
        else
            return;

        /*USE_CLEAN_WAIT
        CMySql q;
        int e(0);
        size_t bytes(0);
        QString output;
        if(item->_data_is_null)
        {
            QMessageBox mb(QMessageBox::Question,tr("store data"),tr("Data will be imported into database. Continue?"),QMessageBox::Ok|QMessageBox::Cancel,this);
            if(mb.exec()==QMessageBox::Ok)
            {
                m_msg()->MsgInf(QObject::tr("importing file '")+item->_target+tr("' into database (insert)"));
                QString compressed_name;
                CMBzip cf(QFileInfo(item->_target).absoluteFilePath(),messages);
                if(cf.compressToTmpdir(compressed_name))
                    e=q.fileToBlob("insert into `library_data` (`bytes`,`data`,`type`) values (",",'","',1)",compressed_name,output,bytes);
                else return;
                if(QFile::remove(compressed_name))
                    m_msg()->MsgMsg(tr("removing temporary file ... Ok."));
                else
                    m_msg()->MsgMsg(tr("removing temporary file ... Failed."));
            }
            else return;
        }
        else
        {
            QMessageBox mb(QMessageBox::Question,tr("store data"),tr("This item has stored data already. Replace?"),QMessageBox::Ok|QMessageBox::Cancel,this);
            if(mb.exec()==QMessageBox::Ok)
            {
                m_msg()->MsgInf(QObject::tr("importing file '")+item->_target+tr("' into database (update)"));
                QString compressed_name;
                CMBzip cf(QFileInfo(item->_target).absoluteFilePath(),messages);
                if(cf.compressToTmpdir(compressed_name))
                    e=q.fileToBlob("update `library_data` set `bytes`=",",`data`='",QString("' where `id`="+QString::number(item->_data)).toUtf8().data(),compressed_name,output,bytes);
                else return;
                if(QFile::remove(compressed_name))
                    m_msg()->MsgMsg(tr("removing temporary file ... Ok."));
                else
                    m_msg()->MsgMsg(tr("removing temporary file ... Failed."));
            }
            else return;
        }
        if(e==0)
        {
            if(item->_data_is_null)
            {
                QString query2("select last_insert_id()"),query("update `library_archive` set `data_id`=last_insert_id() where `id`="+QString::number(item->_id));
                MQUERY_GETFIRST(q2,query2)
                MQUERY(q,query)

                item->_data_is_null=false;
                item->_data=q2.value(0).toUInt();
                item->_data_size=bytes;
                item->setText();
            }
            else
            {
                item->_data_size=bytes;
                item->setText();
            }

            m_msg()->MsgInf(output);
            m_msg()->MsgOk();
        }
        else
            m_msg()->MsgErr(output);*/
    }
    else
        m_msg()->MsgErr(tr("This item has stored/attached data already. Drop/detach them first."));
}

void MArchiveWidget::restoreArchData(MArchiveLibItem * item)
{
    if(item)
    {
        switch(item->_data_type)
        {
        case MArchiveLibItem::NoData :
            return;
            break;
        case MArchiveLibItem::OneFile :
            {
                USE_CLEAN_WAIT
                QFileInfo finfo(item->_target);
                QDir dir(finfo.absoluteDir());
                QString afp(finfo.absoluteFilePath()),
                        tmpf(m_sett()->tmpDir()+QDir::separator()+finfo.fileName()+".bz2");
                if(!finfo.exists())
                {
                    m_msg()->MsgInf(QObject::tr("file '")+afp+QObject::tr("' does not exist, creating new one ..."));
                    if(!dir.exists())
                    {
                        QString dap(dir.absolutePath());
                        m_msg()->MsgInf(QObject::tr("directory '")+dap+QObject::tr("' does not exist, creating path ..."));
                        if(!dir.mkpath(dap))
                        {
                            m_msg()->MsgErr(QObject::tr("cannot create path '")+dap+"'");
                            return;
                        }
                    }

                    QString query("select `data`,`bytes` from `library_data` where `id`="+QString::number(item->_data));
                    MQUERY_GETFIRST(q,query)

                    if(!q.isNULL(0))
                    {
                        QFile f(tmpf);
                        if(f.open(QIODevice::WriteOnly))
                        {
                            if(f.write(q.data(0),q.value(1).toLong())==-1)
                            {
                                f.close();
                                m_msg()->MsgErr(QObject::tr("cannot write into file '")+tmpf+"'");
                                return;
                            }
                            f.close();
                        }
                        else
                        {
                            m_msg()->MsgErr(QObject::tr("cannot open file '")+tmpf+"'");
                            return;
                        }
                    }
                    else
                    {
                        m_msg()->MsgErr(QObject::tr("no data available"));
                        return;
                    }

                    CMBzip bz(tmpf,m_msg());
                    if(!bz.decompress(afp))
                    {
                        m_msg()->MsgErr(tr("decompression of file '")+tmpf+tr("' failed, aborted"));
                        return;
                    }
                    if(QFile::remove(tmpf))
                        m_msg()->MsgMsg(tr("removing temporary file ... Ok."));
                    else
                        m_msg()->MsgMsg(tr("removing temporary file ... Failed."));

                    m_msg()->MsgInf(QObject::tr("file was restored successfully"));
                    m_msg()->MsgOk();
                }
                else
                    m_msg()->MsgWarn(QObject::tr("File '")+afp+QObject::tr("' exist already, aborted."));
                break;
            }
        case MArchiveLibItem::Tarball :
            {
                MArchiver * ar=new MArchiver(item->_data,QString(),false);
                if(ar->isValid())
                {
                    ar->show();
                    if(!ar->checkFilePath(item->_target))
                        m_msg()->MsgErr(tr("Associated file is missing in the archive!"));
                }
                else
                    delete ar;
                break;
            }
        }
    }
}

void MArchiveWidget::on_treeArchive_itemDoubleClicked(QTreeWidgetItem* i, int )
{
    MArchiveLibItem * item((MArchiveLibItem *)i);
    if(item)
    {
        QFileInfo name(item->_target);
        if(!name.isDir())
        {
            QString wtitle(item->_workT+", "+item->_authorT);
            if(!_libraryW->openHtmlBook(m_msg(),name.absoluteFilePath(),CLibraryWidget::Auto,QString(),wtitle)&&!item->_data_is_null)
            {
                QMessageBox mb(QMessageBox::Question,tr("restore data"),tr("Data will be retrieved from database. Continue?"),QMessageBox::Ok|QMessageBox::Cancel,this);
                if(mb.exec()==QMessageBox::Ok)
                {
                    restoreArchData(item);
                    if(item->_data_type==MArchiveLibItem::OneFile)
                        _libraryW->openHtmlBook(m_msg(),name.absoluteFilePath(),CLibraryWidget::Auto,QString(),wtitle);
                }
            }
        }
    }
}

/*void MArchiveWidget::makeRelative(QString & target) const
{
    QFileInfo finf("library");
    target.remove(QRegExp("^"+QRegExp::escape(finf.absolutePath()+QDir::separator())));
}*/

void MArchiveWidget::openArchiveBooks()
{
    //QTreeWidgetItem * ci(ui->treeArchive->currentItem());
    QList<QTreeWidgetItem*> const li(ui->treeArchive->selectedItems());
    /*if(ci)
        if(!li.contains(ci))
            li.prepend(ci);*/

    if(li.count()>1)
    {
        QMessageBox mb(QMessageBox::Question,tr("open archive items"),tr("Open ")+QString::number(li.count())+tr(" items?"),QMessageBox::Open|QMessageBox::Cancel,this);
        if(mb.exec()==QMessageBox::Cancel)
            return;
    }

    for(int x=0;x<li.count();x++)
    {
        //MArchiveItem * i((MArchiveItem *)li.at(x));
        on_treeArchive_itemDoubleClicked(li.at(x),0);
    }
}

void MArchiveWidget::on_btRegExpArch_clicked()
{
    MRegExpBuilder * rb= new MRegExpBuilder(ui->cmbFilterArch->currentText(),ui->cmbFilterArch,false);

    rb->setWindowFlags(Qt::Tool|Qt::Popup);
    rb->setWindowIcon(ui->btRegExpArch->icon());
    rb->move(ui->btRegExpArch->mapToGlobal(QPoint(0,0)));
    rb->show();
    rb->activateWindow();
}

void MArchiveWidget::on_btFilter_toggled(bool checked)
{
    if(checked)
        CLatCopt::updateHistory(ui->cmbFilterArch,false);
    on_treeStruct_itemSelectionChanged();
}

void MArchiveWidget::on_cmbFilterArch_currentIndexChanged(QString )
{
    on_treeStruct_itemSelectionChanged();
}

void MArchiveWidget::checkMIndex(MArchiveLibItem * item)
{
    if(item)
    {
        QString txtid(QString::number(item->_id));
        QString query("select (select sum(`count`) from `library_mindex` where `archive_id`="+txtid+") as `all`,(select count(`word`) from `library_mindex` where `archive_id`="+txtid+") as `all_diff`,(select count(*) from `library_mindex` where `archive_id`="+txtid+" and `lang`=1) as `latin`,(select count(*) from `library_mindex` where `archive_id`="+txtid+" and `lang`=2) as `greek`,(select count(*) from `library_mindex` where `archive_id`="+txtid+" and `lang`=3) as `coptic`,(select count(*) from `library_mindex` where `archive_id`="+txtid+" and `lang`=4) as `hebrew`");

        MQUERY_GETFIRST(q,query)

        item->_index_count=q.value(0).toLong();
        item->_index_count_diff=q.value(1).toLong();
        item->_ind_lat=q.value(2).toLong();
        item->_ind_gk=q.value(3).toLong();
        item->_ind_cop=q.value(4).toLong();
        item->_ind_heb=q.value(5).toLong();

        QString query2("update `library_archive` set `i_count`="+QString::number(item->_index_count)+",`i_count_diff`="+QString::number(item->_index_count_diff)+",`i_lat_count`="+QString::number(item->_ind_lat)+",`i_gk_count`="+QString::number(item->_ind_gk)+",`i_cop_count`="+QString::number(item->_ind_cop)+",`i_heb_count`="+QString::number(item->_ind_heb)+" where `id`="+QString::number(item->_id));

        MQUERY(q2,query2)

        item->setText();
        m_msg()->MsgInf(tr("index - status\n\nwords: ")+QString::number(item->_index_count)+tr("\ndifferent words: ")+QString::number(item->_index_count_diff)+tr("\n\nLatin: ")+QString::number(item->_ind_lat)+tr("\nGreek: ")+QString::number(item->_ind_gk)+tr("\nCoptic: ")+QString::number(item->_ind_cop)+tr("\nHebrew: ")+QString::number(item->_ind_heb));
        m_msg()->MsgOk();
    }
}

void MArchiveWidget::createMIndex(MArchiveLibItem * item)
{
    if(item)
    {
        if(!dropMIndex(item))
            return;

        USE_CLEAN_WAIT

        QFileInfo finfo(item->_target);
        QString fn(finfo.absoluteFilePath());
        QString txt_data;
        if(QString::compare(finfo.suffix(),"pdf",Qt::CaseInsensitive)==0)
        {
#ifndef NO_POPPLER
            m_msg()->MsgMsg(tr("creating index ...\nscanning pdf document, file '")+fn+"' ...");
            if(!MPdfReader2::extractText(fn,txt_data))
            {
                m_msg()->MsgErr(tr("cannot obtain text from pdf file '")+fn+"', aborted");
                return;
            }
#else
            m_msg()->MsgErr(tr("cannot obtain text from pdf file '")+fn+"', aborted");
            return;
#endif
        }
        else
        {
            //USE_CLEAN_WAIT
            QFile f(fn);
            m_msg()->MsgMsg(tr("creating index ...\nscanning document, file '")+fn+"' ...");
            if(f.open(QIODevice::ReadOnly))
            {
                txt_data=QString::fromUtf8(f.readAll());
                f.close();
            }
            else
            {
                m_msg()->MsgErr(tr("cannot open file '")+fn+"'");
                return;
            }
        }

        QList<CMIndexItem> wrds;
        QTextDocument td(txt_data);

        m_msg()->MsgMsg("chars: "+QString::number(td.characterCount()));
        QTextCursor tc(&td);
        tc.movePosition(QTextCursor::Start);
        do{
            QTextCursor tc2(tc);
            tc2.select(QTextCursor::WordUnderCursor);
            QString wrd(tc2.selectedText());
            CTranslit::Script scr(CTranslit::Latin);

            if(CTranslit::isGreek(wrd))
            {
                wrd=CTranslit::tr(wrd,CTranslit::GreekNToGreekTr,true,CTranslit::RemoveNone);
                //wrd=CTranslit::tr(wrd,CTranslit::GreekTrToGreekN,false,false);
                scr=CTranslit::Greek;
            }
            else if(CTranslit::isCoptic(wrd))
            {
                wrd=CTranslit::tr(wrd,CTranslit::CopticNToCopticTr,true,CTranslit::RemoveNone);
                //wrd=CTranslit::tr(wrd,CTranslit::CopticTrToCopticN,false,false);
                scr=CTranslit::Copt;
            }
            else if(CTranslit::isHebrew(wrd))
            {
                wrd=CTranslit::tr(wrd,CTranslit::HebrewNToHebrewTr,true,CTranslit::RemoveNone);
                //wrd=CTranslit::tr(wrd,CTranslit::HebrewTrToHebrewN,false,false);
                scr=CTranslit::Hebrew;
            }
            else
            {
                wrd=CTranslit::tr(wrd,CTranslit::LatinNToLatinTr,true,CTranslit::RemoveNone);
                //wrd=CTranslit::tr(wrd,CTranslit::LatinTrToLatinN,false,false);
                scr=CTranslit::Latin;
            }

            CMIndexItem ii(wrd,scr);
            int i_ii=wrds.indexOf(ii);
            if(i_ii==-1)
                wrds.append(ii);
            else
                wrds[i_ii]._count++;

        }while(tc.movePosition(QTextCursor::NextWord));

        if(wrds.count()>0)
        {
            m_msg()->MsgMsg(tr("words detected: ")+QString::number(wrds.count()));
            QString cmd("insert into `library_mindex` (`archive_id`,`lang`,`word`,`count`) values "),cmdi(cmd+"(<index_data>)");
            for(int x=0;x<wrds.count();x++)
            {
                CMIndexItem const * i(&wrds.at(x));
                QString stri("("+QString::number(item->_id)+",");
                stri.append(QString::number(i->_script)+",'");
                stri.append(i->_word+"',");
                stri.append(QString::number(i->_count)+"),");
                cmd.append(stri);
            }
            cmd.chop(1);

            m_msg()->MsgMsg(tr("writing index data into database, command '")+cmdi+"' ...");
            CMySql q;
            if(!q.exec(cmd))
            {
                m_msg()->MsgErr(q.lastError());
                return;
            }

            m_msg()->MsgInf(tr("index created, ")+QString::number(wrds.count())+tr(" items"));
            m_msg()->MsgOk();
            checkMIndex(item);

            emit indexChanged(CLibSearchBase::Archive);
        }
        else
            m_msg()->MsgInf(tr("no words detected, operation aborted"));
    }
}

bool MArchiveWidget::dropMIndex(MArchiveLibItem * item)
{
    QList<QTreeWidgetItem*> li;
    if(item)
        li.append(item);
    else
        li=ui->treeArchive->selectedItems();

    if(li.count()>0)
    {
        QString w,names;
        for(int x=0;x<li.count();x++)
        {
            MArchiveLibItem * item((MArchiveLibItem *)li.at(x));
            w.append(item->idAsStr()+",");
            names.append(item->_workT+"\n");
        }
        w.chop(1);
        names.append("\n");

        QMessageBox mb(QMessageBox::Question,tr("delete index(es)"),tr("Index(es) of items:\n\n")+names+tr("will be deleted. Continue?"),QMessageBox::Yes|QMessageBox::No,this);
        if(mb.exec()==QMessageBox::Yes)
        {
            QString query("delete from `library_mindex` where `archive_id` in("+w+")");
            MQUERY_RF(q,query)

            for(int x=0;x<li.count();x++)
                checkMIndex((MArchiveLibItem*)li.at(x));

            m_msg()->MsgInf(tr("index(es) removed"));
            m_msg()->MsgOk();

            emit indexChanged(CLibSearchBase::Archive);

            return true;
        }
    }
    return false;
}

void MArchiveWidget::dropArchData()
{
    QList<QTreeWidgetItem*> li(ui->treeArchive->selectedItems());
    if(li.count()>0)
    {
        QString w,w2,names;
        bool tball(false);
        for(int x=0;x<li.count();x++)
        {
            MArchiveLibItem * item((MArchiveLibItem *)li.at(x));
            QString itype;
            switch(item->_data_type)
            {
            case MArchiveLibItem::NoData :
                continue;
                break;
            case MArchiveLibItem::OneFile :
                w2.append(item->iddataAsStr()+",");
                itype=tr("(one file)");
                break;
            case MArchiveLibItem::Tarball :
                itype=tr("(tarball)");
                tball=true;
                break;
            }

            w.append(item->idAsStr()+",");
            names.append(item->_workT+" "+itype+"\n");
        }
        w.chop(1); w2.chop(1);
        names.append("\n");

        QMessageBox mb(QMessageBox::Question,tr("delete/detach stored data"),tr("Data of items:\n\n")+names+tr("will be deleted (single files)/detached (tarballs). Continue? (associated file will not be deleted)"),QMessageBox::Yes|QMessageBox::No,this);
        if(mb.exec()==QMessageBox::Yes)
        {
            QString query("delete from `library_data` where `id` in("+w2+")"),
                    query2("update `library_archive` set `data_id`=null where `id` in("+w+")");

            if(!w2.isEmpty()) {
            MQUERY(q,query) }
            if(!w.isEmpty()) {
            MQUERY(q2,query2) }

            for(int x=0;x<li.count();x++)
            {
                MArchiveLibItem * item((MArchiveLibItem *)li.at(x));
                item->_data_is_null=true;
                item->_data=0;
                item->_data_size=0;
                item->_data_type=MArchiveLibItem::NoData;
                item->setText();
            }

            if(tball)
                emit tgzsChanged();

            m_msg()->MsgInf(tr("stored data were removed"));
            m_msg()->MsgOk();
            //on_treeStruct_currentItemChanged(ui->treeStruct->currentItem(),0);
        }
    }
}

void MArchiveWidget::on_tbAction_toggled(bool checked)
{
    if(checked)
    {
        popupCat.setButton(ui->tbAction);
        on_treeStruct_customContextMenuRequested(QPoint());
    }
}

void MArchiveWidget::on_tbActionArch_toggled(bool checked)
{
    if(checked)
    {
        popupStruct.setButton(ui->tbActionArch);
        on_treeArchive_customContextMenuRequested(QPoint());
    }
}
